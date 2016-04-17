var PACKAGE = 'pandemic-duplicate';
var BASE_URL = location.href;
if (BASE_URL.indexOf('#') != -1) {
	BASE_URL = BASE_URL.substring(0, BASE_URL.indexOf('#'));
}

var Version = 1;
var G = null;
var S = {}; //server settings


// load options
var CFG;
function load_options()
{
	CFG = {};
	CFG.base_game_version = localStorage.getItem(PACKAGE+'.base_game_version')||'2007';
	if (CFG.base_game_version == '2007') {
		Pandemic.Cities['Toronto'].name = 'Toronto';
	}
	else {
		Pandemic.Cities['Toronto'].name = 'Montr\u00e9al';
	}

	CFG.has_on_the_brink = localStorage.getItem(PACKAGE+'.has_on_the_brink')=='true';
	CFG.has_in_the_lab = localStorage.getItem(PACKAGE+'.has_in_the_lab')=='true';
	CFG.has_state_of_emergency = localStorage.getItem(PACKAGE+'.has_state_of_emergency')=='true';

	CFG.game_detail_level = +localStorage.getItem(PACKAGE+'.game_detail_level');
	if (CFG.game_detail_level >= 1) {
		$('.detail_level_1').show();
		$('.no_detail_level_1').hide();
	}
}

function handle_ajax_error(jqx, status, errMsg)
{
	console.log('Ajax error: '+jqx.status + ' '+status+' '+errMsg);
}

function load_game(game_id)
{
	var sid = localStorage.getItem(PACKAGE + '.game.' + game_id + '.scenario');
	if (!sid) {
		console.log('Fatal: game '+game_id+' is not known');
		return;
	}

	var game = load_scenario(sid);

	var s = localStorage.getItem(PACKAGE + '.player_names');
	if (s) {
		game.player_names = JSON.parse(s);
	}

	game.game_id = game_id;
	game.initialize();
	return game;
}

function load_scenario(scenario_id)
{
	var s = localStorage.getItem(PACKAGE + '.scenario.' + scenario_id);
	if (!s) {
		console.log('Fatal: scenario '+scenario_id+' is not known');
		return;
	}

	return Pandemic.GameState.deserialize(scenario_id, s);
}

function init_options_page($pg)
{
	var f = document.options_form;
	var tmp = localStorage.getItem(PACKAGE+'.base_game_version');
	f.base_game_version.value = tmp || '2007';

	f.has_on_the_brink.checked = localStorage.getItem(PACKAGE+'.has_on_the_brink')=='true';
	f.has_in_the_lab.checked = localStorage.getItem(PACKAGE+'.has_in_the_lab')=='true';
	f.has_state_of_emergency.checked = localStorage.getItem(PACKAGE+'.has_state_of_emergency')=='true';

	var tmp1 = localStorage.getItem(PACKAGE+'.game_detail_level');
	f.game_detail_level.value = tmp1 || '0';
}

function save_options_form()
{
	var f = document.options_form;
	localStorage.setItem(PACKAGE+'.base_game_version', f.base_game_version.value);
	localStorage.setItem(PACKAGE+'.has_on_the_brink', f.has_on_the_brink.checked ? 'true' : 'false');
	localStorage.setItem(PACKAGE+'.has_in_the_lab', f.has_in_the_lab.checked ? 'true' : 'false');
	localStorage.setItem(PACKAGE+'.has_state_of_emergency', f.has_state_of_emergency.checked ? 'true' : 'false');
	localStorage.setItem(PACKAGE+'.game_detail_level', f.game_detail_level.value);
	load_options();
}

function init_join_game_pick_page($pg, search_results)
{
	var list = search_results.results;

	$('.no_results_found').toggle(list.length == 0);

	$('.join_game_btn:not(.template)', $pg).remove();
	for (var i = 0; i < list.length; i++) {
		var g = list[i];
		var r = load_scenario(list[i].scenario_id);
		if (!r) { continue; }

		var $g = $('.join_game_btn.template', $pg).clone();
		$g.removeClass('template');

		$('.scenario_name_container', $g).append(make_scenario_label(g.scenario_id));
		$('.module_list_container', $g).append(make_modules_label(r.rules));
		update_scenario_description($g, r.rules);

		for (var pid = 1; pid <= r.rules.player_count; pid++) {
			var p_name = g.players[pid-1];
			var $p_name = $('<span><img class="role_icon"><span class="player_name"></span></span>');
			$('.role_icon',$p_name).attr('src', get_role_icon(r.roles[pid]));
			$('.player_name',$p_name).text(p_name);
			$('.player_list', $g).append($p_name);
			if (pid < r.rules.player_count) {
				$('.player_list',$g).append(', ');
			}
		}

		if (g.location) {
			$('.location', $g).text(g.location);
			$('.location_container',$g).show();
		}

		$('button', $g).attr('data-game-id', g.id);
		$('button', $g).click(on_join_game_picked);

		$('.join_game_btn.template', $pg).before($g);
	}

	console.log('found '+list.length+' results');
}

var channel = {};

function setup_channel(token)
{
	channel.channel = new goog.appengine.Channel(token);
	channel.sock = channel.channel.open();
	channel.sock.onopen = function() {
			channel.connected = true;
			console.log("channel: opened");
		};
	channel.sock.onmessage = function(msg) {
			console.log("channel: message received");
			console.log(msg.data);
			handle_channel_message(msg.data);
		};
	channel.sock.onerror = function(errObj) {
			console.log("channel: error "+errObj);
		};
	channel.sock.onclose = function() {
			channel.connected = false;
			console.log("channel: closed");
		};
}

function handle_channel_message(raw_message)
{
	var msg = JSON.parse(raw_message);
	if (msg.moves) {
		update_watched_game(msg.moves);
	}
}

function on_join_game_picked()
{
	var game_id = this.getAttribute('data-game-id');
	goto_state(escape(game_id) + '/watch');
	return false;
}

function do_watch_game(game_id, xtra)
{
	var onSuccess = function(data) {
		localStorage.setItem(PACKAGE+'.current_game', game_id);
		localStorage.setItem(PACKAGE+'.current_game.subscriber', data.subscriber_id);

		console.log("subscribe: got id "+data.subscriber_id);
		console.log("subscribe: channel token is "+data.channel);
		setup_channel(data.channel);

		console.log("got game data "+JSON.stringify(data.game));
		show_watched_game(game_id, data.game, xtra);
	};

	$.ajax({
		type: 'POST',
		url: 's/games?subscribe='+escape(game_id),
		dataType: 'json',
		success: onSuccess,
		error: handle_ajax_error
		});
}

var watched_game_info = {};
var watched_game_data = null;

function update_watched_game(moves_array)
{
	watched_game_data.moves = moves_array;
	reload_watched_game();
}

function show_watched_game(game_id, game_data, xtra)
{
	watched_game_info = {
		'game_id': game_id,
		'xtra': xtra
		};
	watched_game_data = game_data;
	reload_watched_game();
}

function reload_watched_game()
{
	var game_data = watched_game_data;

	G = load_scenario(game_data.scenario_id);

	G.player_names = {};
	for (var pid = 1; pid <= game_data.players.length; pid++) {
		G.player_names[pid] = game_data.players[pid-1];
	}

	G.game_id = watched_game_info.game_id;
	G.initialize();
	while (G.time < game_data.moves.length) {

		var mv = game_data.moves[G.time];
		G.do_move(mv);
	}

	G.has_control = false;
	show_current_game(watched_game_info.xtra);

	check_screen_size();
}

function show_current_game(xtra)
{
	if (xtra == '/discards') {
		var $pg = show_page('show_discards_page');
		return init_show_discards_page($pg);
	}
	else if (xtra == '/play_special') {
		var $pg = show_page('special_event_page');
		return init_play_special_event_page($pg);
	}
	else if (xtra == '/retrieve_special') {
		var $pg = show_page('special_event_page');
		return init_retrieve_special_event_page($pg);
	}
	else if (xtra == '/virulent_strain') {
		var $pg = show_page('virulent_strain_page');
		return init_virulent_strain_page($pg);
	}
	else if (xtra == '/discover_cure') {
		var $pg = show_page('discover_cure_page');
		return init_discover_cure_page($pg);
	}

	if (G.step == 'actions') {
		var $pg = show_page('player_turn_page');
		init_player_turn_page($pg);
	}
	else if (G.step == 'draw_cards') {
		var $pg = show_page('player_turn_page');
		init_draw_cards_page($pg);
	}
	else if (G.step == 'mutation') {
		var $pg = show_page('player_turn_page');
		init_epidemic_page($pg);
	}
	else if (G.step == 'epidemic') {
		var $pg = show_page('player_turn_page');
		init_epidemic_page($pg);
	}
	else if (G.step == 'infection') {
		var $pg = show_page('player_turn_page');
		init_infection_page($pg);
	}
	else if (G.step == 'forecast') {
		var $pg = show_page('forecast_page');
		init_forecast_page($pg);
	}
	else if (G.step == 'resource_planning') {
		var $pg = show_page('resource_planning_page');
		init_resource_planning_page($pg);
	}
	else if (G.step == 'end') {
		var $pg = show_page('game_completed_page');
		init_game_completed_page($pg);
	}
	else {
		alert('unrecognized game state');
		return;
	}
}

function do_search_results(q)
{
	var onSuccess = function(data) {
		var $pg = show_page('found_completed_games_page');
		init_found_completed_games_page($pg, data);
	};

	var u = 's/results?q='+escape(q);
	$.ajax({
		type: "GET",
		url: u,
		dataType: "json",
		success: onSuccess,
		error: handle_ajax_error
		});
}

function do_search_network_game(name)
{
	var onSuccess = function(data) {
		var $pg = show_page('join_game_pick_page');
		init_join_game_pick_page($pg, data);
	};

	var u = 's/games?search_player='+escape(name);
	$.ajax({
		type: "GET",
		url: u,
		dataType: "json",
		success: onSuccess,
		error: handle_ajax_error
		});
}

function submit_generate_game_form()
{
	var f = document.generate_game_form;
	var rules = {
		'player_count': +f.player_count.value,
		'level': +f.level.value,
		'on_the_brink': f.on_the_brink.checked,
		'in_the_lab': f.in_the_lab.checked,
		'state_of_emergency': f.state_of_emergency.checked,
		'virulent_strain': f.virulent_strain.checked,
		'lab_challenge': f.lab_challenge.checked,
		'mutation_challenge': f.mutation_challenge.checked,
		'worldwide_panic': f.worldwide_panic.checked,
		'quarantines': f.quarantines.checked,
		'hinterlands_challenge': f.hinterlands_challenge.checked,
		'emergency_event_challenge': f.emergency_event_challenge.checked,
		'superbug_challenge': f.superbug_challenge.checked
		};
	G = generate_scenario(rules);
	trigger_upload_scenario(G.scenario_id);

	// create game
	G.game_id = generate_new_game_id(G.scenario_id);
	console.log("new game id is "+G.game_id);

	localStorage.setItem(PACKAGE + '.game.' + G.game_id + '.scenario', G.scenario_id);
	localStorage.setItem(PACKAGE + '.scenario.' + G.scenario_id + '.current_game', G.game_id);

	G = load_game(G.game_id);
	start_publishing_game(G.game_id);

	goto_state(G.game_id+'/player_setup');
	return false;
}

function init_player_names_page($pg, xtra)
{
	var pcount = 2;
	var m = xtra.match(/^(\d+)p$/);
	if (m) {
		pcount = +m[1];
	}

	G = new Pandemic.GameState();
	var s = localStorage.getItem(PACKAGE + '.player_names');
	if (s) {
		G.player_names = JSON.parse(s);
	}
	else {
		G.player_names = {};
	}

	var f = document.player_names_form;
	f.location.value = localStorage.getItem(PACKAGE+'.game_location');
	f.player_count.value = pcount;
	f.player1.value = G.player_names[1] || 'Player 1';
	f.player2.value = G.player_names[2] || 'Player 2';
	f.player3.value = G.player_names[3] || 'Player 3';
	f.player4.value = G.player_names[4] || 'Player 4';
	f.player5.value = G.player_names[5] || 'Player 5';
	
	if (pcount <= 2) {
		$('.player3', $pg).hide();
		$('.player4', $pg).hide();
		$('.player5', $pg).hide();
	}
	else if (pcount == 3) {
		$('.player3', $pg).show();
		$('.player4', $pg).hide();
		$('.player5', $pg).hide();
	}
	else if (pcount == 4) {
		$('.player3', $pg).show();
		$('.player4', $pg).show();
		$('.player5', $pg).hide();
	}
	else {
		$('.player3', $pg).show();
		$('.player4', $pg).show();
		$('.player5', $pg).show();
	}
}

function update_game_score()
{
	// cure count only used on loss
	var num_cures = G.result == 'victory' ? 4 :
		+document.game_completed_form.cure_count.value;
	var num_turns = +G.turns;

	var score;
	if (G.result == 'victory') {
		var turns_left = Math.floor(G.player_deck.length/2);
		score = 100+turns_left;
	}
	else {
		score = num_cures*12+num_turns;
	}
	document.game_completed_form.score.value = score;
	document.game_completed_form.cures.value = num_cures;
	document.game_completed_form.turns.value = num_turns;
	$('.score_ind').text(score);
}

function init_game_completed_page($pg)
{
	var f = document.game_completed_form;
	f.location.value = localStorage.getItem(PACKAGE + '.game_location');
	f.rules.value = stringify_rules(G.rules);
	f.cure_count.value = G.count_cured_diseases();
	f.scenario_id.value = G.scenario_id;
	f.game_id.value = G.game_id;

	$('.turns', $pg).text(G.turns);
	$('.turns_left', $pg).text(Math.floor(G.player_deck.length/2));
	$('.level', $pg).text(G.rules.level);
	if (G.result == 'victory') {
		var victory_type;
		if (G.is_unnecessary('purple')) {
			victory_type = "cured all four diseases";
		}
		else if (is_cured(G, 'purple')) {
			victory_type = "cured all five diseases";
		}
		else {
			victory_type = "cured all four normal diseases and wiped purple off the board";
		}
		$('.victory_type', $pg).text(victory_type);
		$('.victory_only', $pg).show();
		$('.defeat_only', $pg).hide();
	}
	else {
		$('.victory_only', $pg).hide();
		$('.defeat_only', $pg).show();
	}
	update_game_score();

	if (G.rules.player_count <= 2) {
		$('.player3', $pg).hide();
		$('.player4', $pg).hide();
		$('.player5', $pg).hide();
	}
	else if (G.rules.player_count == 3) {
		$('.player3', $pg).show();
		$('.player4', $pg).hide();
		$('.player5', $pg).hide();
	}
	else if (G.rules.player_count == 4) {
		$('.player3', $pg).show();
		$('.player4', $pg).show();
		$('.player5', $pg).hide();
	}
	else {
		$('.player3', $pg).show();
		$('.player4', $pg).show();
		$('.player5', $pg).show();
	}

	for (var i = 1; i <= G.rules.player_count; i++) {
		$('.player'+i+' input', $pg).attr('value', G.player_names[i]);
		$('.player'+i+' .role_icon', $pg).attr('src', get_role_icon(G.roles[i]));
		$('.player'+i+' .role', $pg).text(G.roles[i]);
	}
}

function submit_player_names_form()
{
	var f = document.player_names_form;
	var pcount = +f.player_count.value;
	G = new Pandemic.GameState();
	G.rules = { 'player_count': pcount };
	G.player_names = {
		'1': f.player1.value,
		'2': f.player2.value,
		'3': f.player3.value,
		'4': f.player4.value,
		'5': f.player5.value
		};
	var randomize = f.randomize_order.value;
	if (randomize == 'full') {
		for (var i = 0; i < G.rules.player_count; i++) {
			var j = i+Math.floor(Math.random() * (G.rules.player_count-i));
			var tmp = G.player_names[1+i];
			G.player_names[1+i] = G.player_names[1+j];
			G.player_names[1+j] = tmp;
		}
	}
	else if (randomize == 'start_player') {
		var t = Math.floor(Math.random() * G.rules.player_count);
		var p = {};
		for (var i = 0; i < Pandemic.MAX_PLAYERS; i++) {
			p[1+i] = i < G.rules.player_count ?
				G.player_names[1+(i+t)%G.rules.player_count] :
				G.player_names[1+i];
		}
		G.player_names = p;
	}

	localStorage.setItem(PACKAGE+'.game_location', f.location.value);
	save_player_names();

	goto_state('pick_scenario/' + pcount + 'p');
	return false;
}

function save_player_names()
{
	localStorage.setItem(PACKAGE+'.player_names',
		JSON.stringify(G.player_names)
		);
}

function init_deck_setup_page($pg, scenario_id)
{
	G = load_scenario(scenario_id);

	$('#player_cards_list').empty();
	for (var i = 0; i < G.player_deck.length; i++) {
		var c = G.player_deck[G.player_deck.length-1-i];
		var $x = $('<li></li>');
		$x.text(c);
		$('#player_cards_list').append($x);
	}

	$('#infection_cards_list').empty();
	for (var i = 0; i < G.infection_deck.length; i++) {
		var c = G.infection_deck[G.infection_deck.length-1-i];
		var $x = $('<li></li>');
		$x.text(c);
		$('#infection_cards_list').append($x);
	}

	return false;
}

function init_board_setup_page($pg, game_id)
{
	G = load_game(game_id);

	$('.3cube_cities').empty();
	for (var i = 0; i < 3; i++) {
		var c = G.infection_discards[i];
		if (G.rules.worldwide_panic && i == 0) {
			$('.3cube_cities').append(make_infection_card_li(c).append(' (plus 1 purple cube)'));
		}
		else {
			$('.3cube_cities').append(make_infection_card_li(c));
		}
	}

	$('.2cube_cities').empty();
	for (var i = 3; i < 6; i++) {
		var c = G.infection_discards[i];
		if (G.rules.worldwide_panic && i == 3) {
			$('.2cube_cities').append(make_infection_card_li(c).append(' (plus 2 purple cubes)'));
		}
		else {
			$('.2cube_cities').append(make_infection_card_li(c));
		}
	}

	$('.1cube_cities').empty();
	for (var i = 6; i < 9; i++) {
		var c = G.infection_discards[i];
		if (G.rules.worldwide_panic && i == 6) {
			$('.1cube_cities').append(make_infection_card_li(c).append(' (plus 3 purple cubes)'));
		}
		else {
			$('.1cube_cities').append(make_infection_card_li(c));
		}
	}

	if (G.rules.lab_challenge) {
		var c = G.sequence_discards[0];
		$('.initial_lab_sequence_card').show();
		$('.sequence_card').empty();
		$('.sequence_card').append(make_sequence_card_li(c));
	}
	else {
		$('.initial_lab_sequence_card').hide();
	}
}

function init_player_setup_page($pg, game_id)
{
	G = load_game(game_id);
}

function init_results_page($pg, scenario_id)
{
	G = load_scenario(scenario_id);
	
	$('.scenario_name', $pg).text(scenario_name(scenario_id));

	var all_result_ids = stor_get_list(PACKAGE + '.game_results.' + scenario_id);
	var my_result_id = localStorage.getItem(PACKAGE + '.my_result.' + scenario_id);
	if (my_result_id) {
		all_result_ids.push(my_result_id);
	}

	var seen = {};
	var all_results = [];
	for (var i = 0; i < all_result_ids.length; i++) {
		if (seen[all_result_ids[i]]) { continue; }
		seen[all_result_ids[i]] = true;

		var result_id = all_result_ids[i];
		var r = load_result(result_id);
		if (!r) { continue; }
		if (r.scenario_id != scenario_id) { continue; }

		if (all_result_ids[i] == my_result_id) {
			r.mine = true;
		}
		all_results.push(r);
	}

	all_results.sort(function(a,b) {
		return +a.score < +b.score ? 1 :
			+a.score > +b.score ? -1 :
			a.time < b.time ? -1 :
			a.time > b.time ? 1 : 0;
		});

	var place = 0;

	$('.result_row:not(.template)', $pg).remove();
	for (var i = 0; i < all_results.length; i++) {
		var r = all_results[i];

		var $tr = $('.result_row.template', $pg).clone();
		$tr.removeClass('template');
		$tr.addClass(i%2==0 ? 'even_row' : 'odd_row');
		if (r.mine) {
			$tr.addClass('my_result');
		}

		var rules = parse_rules(r.rules);
		var $pcol = $('.players_col', $tr);
		for (var j = 1; j <= rules.player_count; j++) {
			var $p = $('<nobr><img class="role_icon"><span class="player_name"></span></nobr>');
			$('.role_icon', $p).attr('src', get_role_icon(G.roles[j])).
				attr('alt', G.roles[j]);
			$('.player_name', $p).text(r['player'+j]);

			if (j < rules.player_count) {
				$p.append(', ');
			}
			$pcol.append($p);
		}

		var is_a_tie = (i > 0 && all_results[i-1].score == r.score) ||
			(i+1 < all_results.length && all_results[i+1].score == r.score);
		place = (i > 0 && all_results[i-1].score == r.score) ? place : i+1;

		$('.place_col', $tr).text((is_a_tie ? 'T' : '') + place);
		$('.score_col', $tr).text(r.score);
		$('.location_col', $tr).text(r.location);
		if (r.localOnly) {
			$('.submitted_col', $tr).text('no');
		} else if (r.time) {
			$('.submitted_col', $tr).text(format_time(r.time));
		}

		$('.result_row.template', $pg).before($tr);
	}
}

function make_player_card_li(c)
{
	var $x = $('<li></li>');
	$x.append(make_player_card(c));
	$x.attr('data-card-name', c);
	return $x;
}

function make_player_card(c)
{
	var ci = Pandemic.Cities[c];

	var $x = $('<span class="player_card"><img src="" class="card_icon"><span class="card_name"></span></span>');
	if (ci) {
		$('.card_name', $x).text(ci.name);
		$('.card_icon', $x).attr('src', ci.color+'_icon.png');
		$x.addClass(ci.color + '_card');
	}
	else if (c == 'Epidemic') {
		$('.card_name', $x).text('Epidemic!');
		$('.card_icon', $x).attr('src', 'epidemic_icon.png');
		$x.addClass('epidemic_card');
	}
	else if (is_epidemic(c)) {
		$('.card_name', $x).text(c + '!');
		$('.card_icon', $x).attr('src', 'virulent_epidemic_icon.png');
		$x.addClass('epidemic_card');
	}
	else if (is_mutation(c)) {
		var text = is_mutation(c);
		$('.card_name', $x).text(text + '!');
		$('.card_icon', $x).attr('src', 'purple_icon.png');
		$x.addClass('mutation_card');
	}
	else if (is_emergency(c)) {
		var text = is_emergency(c);
		$('.card_name', $x).text(text);
		$('.card_icon', $x).attr('src', 'emergency_event_icon.png');
		$x.addClass('emergency_card');
	}
	else {
		$('.card_name', $x).text(c);
		$('.card_icon', $x).attr('src', 'special_event_icon.png');
		$x.addClass('special_card');
	}

	return $x;
}

function make_infection_card(c)
{
	var $x = $('<span class="infection_card"><img src="" class="card_icon"><span class="card_name"></span></span>');

	var text = is_mutation(c);

	if (text) {
		text += '!';
		$('.card_icon', $x).attr('src', 'purple_icon.png');
		$x.addClass('mutation_card');
	}
	else {
		var ci = Pandemic.Cities[c];
		text = ci.name;
		$('.card_icon', $x).attr('src', ci.color+'_icon.png');
		$x.addClass(ci.color + '_card');
	}
	
	$('.card_name', $x).text(text);
	return $x;
}

function make_infection_card_li(c)
{
	var $x = $('<li></li>');
	$x.append(make_infection_card(c));
	$x.attr('data-city-name', c);
	return $x;
}

function make_sequence_card_li(c)
{
	var $x = $('<li></li>');
	$x.append(make_sequence_card(c));
	return $x;
}

function make_sequence_card(c)
{
	var $x = $('<span class="sequence_card"><img src="" class="card_icon"><span class="card_name"></span></span>');
	$('.card_name', $x).text(c);
	$('.card_icon', $x).attr('src', 'sequence_card_icon.png');

	return $x;
}

function load_game_at(game_id, target_time)
{
	G = load_game(game_id);

	target_time = +target_time;
	while (G.time < target_time) {

		var mv = get_move(G.scenario_id, G.game_id, G.time);
		G.do_move(mv);
	}

	G.has_control = true;

	var prior_time = localStorage.getItem(PACKAGE + '.game.' + game_id + '.time');
	if (G.time != +prior_time) {
		localStorage.setItem(PACKAGE + '.game.' + game_id + '.time', G.time);
		trigger_upload_game_state();
	}
}

function get_move(scenario_id, game_id, time)
{
	var mv = localStorage.getItem(PACKAGE + '.game.' + game_id + '.T' + time);
	if (mv != null) {
		return mv;
	}

	// backwards compatibility
	var mv = localStorage.getItem(PACKAGE + '.game.' + scenario_id + '.T' + time);
	return mv != null ? mv : 'pass';
}

function find_and_remove_card(pile, card_name)
{
	for (var i = 0; i < pile.length; i++) {
		if (pile[i] == card_name) {
			pile.splice(i, 1);
			return card_name;
		}
	}
	return null;
}

function make_history_item(evt)
{
	if (evt.type == 'infection') {
		var $e = $('<div class="infection_event"></div>');
		$e.append(make_infection_card(evt.infection));
		var ci = Pandemic.Cities[evt.infection];
		if (G.is_eradicated(ci.color)) {
			$e.append(' is not infected (eradicated)');
		}
		else if (G.chronic_effect && G.virulent_strain == ci.color) {
			$e.append(' is infected (add 1 or 2 cubes)');
		}
		else {
			$e.append(' is infected (add 1 cube)');
		}
		return $e;
	}
	else if (evt.type == 'epidemic') {
		var $e = $('<div class="epidemic_event"></div>');
		$e.append(make_infection_card(evt.epidemic));
		var ci = Pandemic.Cities[evt.epidemic];
		if (G.is_eradicated(ci.color)) {
			$e.append(' is not infected (eradicated)');
		}
		else {
			$e.append(' is infected (<em>add 3 cubes!</em>)');
		}
		return $e;
	}
	else if (evt.type == 'draw_card') {
		var $e = $('<div class="draw_card_event"><span class="player_name"></span> draws <span class="card_container"></span></div>');
		$('.player_name',$e).text(G.player_names[evt.player]);
		$('.card_container',$e).append(make_player_card(evt.card));
		return $e;
	}
	else if (evt.type == 'draw_epidemic') {
		var $e = $('<div class="draw_epidemic_event"><span class="first"></span> <span class="card_container"></span> is triggered</div>');
		$('.first',$e).text(evt.epidemic_count == 1 ? 'First' :
			evt.epidemic_count == 2 ? 'Second' :
			evt.epidemic_count == 3 ? 'Third' :
			(evt.epidemic_count + 'th'));
		$('.card_container',$e).append(make_player_card(evt.card));
		return $e;
	}
	else if (evt.type == 'next_turn') {
		var $e = $('<div class="next_turn_event">===== <img class="role_icon"><span class="player_name"></span>\'s turn =====</div>');
		var r = G.roles[evt.active_player];
		$('.role_icon',$e).attr('alt', r).
			attr('src', get_role_icon(r));
		$('.player_name',$e).text(G.player_names[evt.active_player]);
		return $e;
	}
	else if (evt.type == 'draw_sequence_card') {
		var $e = $('<div class="draw_sequence_card_event"><span class="player_name"></span> draws <span class="card_container"></span></div>');
		$('.player_name',$e).text(G.player_names[evt.player]);
		$('.card_container',$e).append(make_sequence_card(evt.card));
		return $e;
	}
	else if (evt.type == 'special_event') {
		var $e = $('<div class="special_event_event"><span class="player_name"></span> plays <span class="card_container"></span></div>');
		$('.player_name',$e).text(G.player_names[evt.player]);
		$('.card_container',$e).append(make_player_card(evt.card));
		return $e;
	}
	else if (evt.type == 'retrieve_special_event') {
		var $e = $('<div class="special_event_event"><span class="player_name"></span> retrieves <span class="card_container"></span></div>');
		$('.player_name',$e).text(G.player_names[evt.player]);
		$('.card_container',$e).append(make_player_card(evt.card));
		return $e;
	}
	else if (evt.type == 'discover_cure') {
		var $e = $('<div class="discover_cure_event"><span class="player_name"></span> cures <span class="disease_name_container"><img src="" class="card_icon" alt=""></span></div>');
		$('.player_name',$e).text(G.player_names[evt.player]);
		$('.disease_name_container img',$e).attr('src', evt.disease+'_icon.png');
		$('.disease_name_container',$e).append(Pandemic.Diseases[evt.disease]);
		return $e;
	}
	else if (evt.type == 'eradicate') {
		var $e = $('<div class="eradicate_event"><span class="disease_name_container"><img src="" class="card_icon" alt=""></span> is eradicated</div>');
		$('.disease_name_container img',$e).attr('src', evt.disease+'_icon.png');
		$('.disease_name_container',$e).append(Pandemic.Diseases[evt.disease]);
		return $e;
	}
	else if (evt.type == 'virulent_strain') {
		var $e = $('<div class="virulent_strain_event">&nbsp; --> <span class="disease_name_container"><img src="" class="card_icon" alt=""></span> becomes the virulent strain</div>');
		$('.disease_name_container img',$e).attr('src', evt.disease+'_icon.png');
		$('.disease_name_container',$e).append(Pandemic.Diseases[evt.disease]);
		return $e;
	}
	else if (evt.type == 'resilient_population') {
		var $e = $('<div class="resilient_population_event">&nbsp; --> <span class="card_container"></span> is made resilient</div>');
		$('.card_container',$e).append(make_infection_card(evt.city));
		return $e;
	}
	else if (evt.type == 'infection_rumor') {
		var $e = $('<div class="infection_rumor_event">&nbsp; --> <span class="card_container"></span> is discarded</div>');
		$('.card_container',$e).append(make_infection_card(evt.city));
		return $e;
	}
	else if (evt.type == 'vs_epidemic_dud') {
		var $e = $('<div class="vs_epidemic_dud_event">&nbsp; --> <span class="epidemic_name"></span>: no effect</div>');
		$('.epidemic_name',$e).text(evt.epidemic);
		return $e;
	}
	else if (evt.type == 'chronic_effect_activate') {
		var $e = $('<div class="chronic_effect_activate_event">&nbsp; --> Chronic Effect activates (<span class="disease_name_container"><img src="" class="card_icon" alt=""></span>)</div>');
		$('.disease_name_container img',$e).attr('src', evt.disease+'_icon.png');
		$('.disease_name_container',$e).append(Pandemic.Diseases[evt.disease]);
		return $e;
	}
	else if (evt.type == 'complex_molecular_structure_activate') {
		var $e = $('<div class="complex_molecular_structure_activate_event">&nbsp; --> Complex Molecular Structure: <span class="disease_name_container"><img src="" class="card_icon" alt=""></span> now requires an additional card to cure</div>');
		$('.disease_name_container img',$e).attr('src', evt.disease+'_icon.png');
		$('.disease_name_container',$e).append(Pandemic.Diseases[evt.disease]);
		return $e;
	}
	else if (evt.type == 'government_interference_activate') {
		var $e = $('<div class="government_interference_activate_event">&nbsp; --> Government Interference activates (<span class="disease_name_container"><img src="" class="card_icon" alt=""></span>)</div>');
		$('.disease_name_container img',$e).attr('src', evt.disease+'_icon.png');
		$('.disease_name_container',$e).append(Pandemic.Diseases[evt.disease]);
		return $e;
	}
	else if (evt.type == 'hidden_pocket_activate') {
		var $e = $('<div class="hidden_pocket_activate_event">&nbsp; --> Hidden Pocket: <span class="disease_name_container"><img src="" class="card_icon" alt=""></span> is no longer eradicated</div>');
		$('.disease_name_container img',$e).attr('src', evt.disease+'_icon.png');
		$('.disease_name_container',$e).append(Pandemic.Diseases[evt.disease]);
		return $e;
	}
	else if (evt.type == 'hidden_pocket_infect') {
		var $e = $('<div class="hidden_pocket_infect_event"></div>');
		$e.append(make_infection_card(evt.city));
		var ci = Pandemic.Cities[evt.city];
		$e.append(' is infected (add 1 cube)');
		return $e;
	}
	else if (evt.type == 'rate_effect_activate') {
		var $e = $('<div class="rate_effect_activate_event">&nbsp; --> Rate Effect activates (<span class="disease_name_container"><img src="" class="card_icon" alt=""></span>)</div>');
		$('.disease_name_container img',$e).attr('src', evt.disease+'_icon.png');
		$('.disease_name_container',$e).append(Pandemic.Diseases[evt.disease]);
		return $e;
	}
	else if (evt.type == 'rate_effect_deactivate') {
		var $e = $('<div class="rate_effect_deactivate_event">&nbsp; --> Rate Effect is no longer active</div>');
	}
	else if (evt.type == 'rate_effect_trigger') {
		var $e = $('<div class="rate_effect_trigger_event">&nbsp; --> Rate Effect triggers</div>');
		return $e;
	}
	else if (evt.type == 'slippery_slope_activate') {
		var $e = $('<div class="slippery_slope_activate_event">&nbsp; --> Slippery Slope: <span class="disease_name_container"><img src="" class="card_icon" alt=""></span> outbreaks now count double</div>');
		$('.disease_name_container img',$e).attr('src', evt.disease+'_icon.png');
		$('.disease_name_container',$e).append(Pandemic.Diseases[evt.disease]);
		return $e;
	}
	else if (evt.type == 'unacceptable_loss') {
		var $e = $('<div class="unacceptable_loss_event">&nbsp; --> Unacceptable Loss: remove 4 <span class="disease_name_container"><img src="" class="card_icon" alt=""></span> cubes from supply</div>');
		$('.disease_name_container img',$e).attr('src', evt.disease+'_icon.png');
		$('.disease_name_container',$e).append(Pandemic.Diseases[evt.disease]);
		return $e;
	}
	else if (evt.type == 'uncounted_populations') {
		var $e = $('<div class="uncounted_populations_event">&nbsp; --> Uncounted Populations: cities with exactly 1 <span class="disease_name_container"><img src="" class="card_icon" alt=""></span> cube get a second</div>');
		$('.disease_name_container img',$e).attr('src', evt.disease+'_icon.png');
		$('.disease_name_container',$e).append(Pandemic.Diseases[evt.disease]);
		return $e;
	}
	else if (evt.type == 'highly_contagious_activate') {
		var $e = $('<div class="highly_contagious_activate_event">&nbsp; --> Highly Contagious: <span class="disease_name_container"><img src="" class="card_icon" alt=""></span> outbreaks now add two cubes instead of one</div>');
		$('.disease_name_container img',$e).attr('src', evt.disease+'_icon.png');
		$('.disease_name_container',$e).append(Pandemic.Diseases[evt.disease]);
		return $e;
	}
	else if (evt.type == 'resistant_to_treatment_activate') {
		var $e = $('<div class="resistant_to_treatment_activate_event">&nbsp; --> Resistant to Treatment: <span class="disease_name_container"><img src="" class="card_icon" alt=""></span> cubes now take two actions to treat</div>');
		$('.disease_name_container img',$e).attr('src', evt.disease+'_icon.png');
		$('.disease_name_container',$e).append(Pandemic.Diseases[evt.disease]);
		return $e;
	}
	else if (evt.type == 'mutation') {
		var $e = $('<div class="mutation_event">&nbsp; --> </div>');
		$e.append(make_infection_card(evt.city));
		$e.append(' is infected (add ' + evt.count + ' purple cube' + (evt.count > 1 ? 's' : '') + ')');
		return $e;
	}
	else if (evt.type == 'draw_mutation') {
		var $e = $('<div class="draw_mutation_event"><span class="card_container"></span> is drawn</div>');
		$('.card_container',$e).append(make_player_card(evt.card));
		return $e;
	}
	else if (evt.type == 'draw_infection_mutation') {
		var $e = $('<div class="draw_mutation_event"><span class="card_container"></span> is drawn</div>');
		$('.card_container',$e).append(make_infection_card(evt.card));
		return $e;
	}
	else if (evt.type == 'mutation_dud') {
		var $e = $('<div class="mutation_dud_event">&nbsp; --> <span class="mutation_name"></span>: no effect</div>');
		$('.mutation_name',$e).text(evt.mutation);
		return $e;
	}
	else if (evt.type == 'hinterlands_infection') {
		var $e = $('<div class="hinterlands_infection_event"><span class="infection_card"><img src="" class="color_icon"><span class="color_name"></span></span></div>');
		$('.color_icon', $e).attr('src', evt.color + '_icon.png');
		$('.color_name', $e).text(Disease_Names[evt.color]);

		if (G.is_eradicated(evt.color)) {
			$e.append(' is rolled (eradicated)');
		}
		else if (G.chronic_effect && G.virulent_strain == evt.color) {
			$e.append(' is rolled (add 1 or 2 cubes)');
		}
		else {
			$e.append(' is rolled (add 1 cube)');
		}
		return $e;
	}
	else if (evt.type == 'hinterlands_dud') {
		var $e = $('<div class="hinterlands_dud_event">Blank result is rolled -- no effect!</div>');
		return $e;
	}
	else {
		console.log("Unrecognized event type: '" + evt.type + "'");
		return null;
	}
}

function init_history_pane($h)
{
	$h.empty();

	var last = G.history.length;
	var first = last-1;
	while (first > 0 && G.history[first].type != 'next_turn') {
		first--;
	}

	for (var i = first; i < last; i++) {
		var evt = G.history[i];
		var $e = make_history_item(evt);
		if ($e) {
			$h.append($e);
		}
	}
}

var Role_icons = {
	'Dispatcher': 'dispatcher_role_icon.png',
	'Operations Expert': 'operations_expert_role_icon.png',
	'Scientist': 'scientist_role_icon.png',
	'Medic': 'medic_role_icon.png',
	'Researcher': 'researcher_role_icon.png',
	'Field Operative': 'field_operative_role_icon.png',
	'Containment Specialist': 'containment_specialist_role_icon.png',
	'Generalist': 'generalist_role_icon.png',
	'Archivist': 'archivist_role_icon.png',
	'Epidemiologist': 'epidemiologist_role_icon.png',
	'Troubleshooter': 'troubleshooter_role_icon.png',
	'Field Director': 'field_director_role_icon.png',
	'Virologist': 'virologist_role_icon.png',
	'Local Liaison': 'local_liaison_role_icon.png',
	'Pilot': 'pilot_role_icon.png',
	'Contingency Planner': 'contingency_planner_role_icon.png',
	'Quarantine Specialist': 'quarantine_specialist_role_icon.png',
	'Colonel': 'colonel_role_icon.png',
	'First Responder': 'first_responder_role_icon.png',
	'Pharmacist': 'pharmacist_role_icon.png',
	'Veterinarian': 'veterinarian_role_icon.png',
	'Gene Splicer': 'gene_splicer_role_icon.png'
	};
function get_role_icon(r)
{
	return 'images/'+Role_icons[r];
}

//returns the player-id of the player who had it
function find_and_remove_card_any_hand(c)
{
	for (var i = 1; i <= G.rules.player_count; i++) {
		var cc = find_and_remove_card(G.hands[i], c);
		if (cc) {
			G.player_discards.push(cc);
			return i;
		}
	}
	return null;
}

function set_game_state_summary($pg)
{
	var r = G.roles[G.active_player];
	$('.page_header .role_icon', $pg).
		attr('alt', r).
		attr('src', get_role_icon(r));
	$('.page_header .player_name', $pg).text(
			G.player_names[G.active_player]
			);

	$('.game_state_summary_pane .turn_number', $pg).text(
			G.turns + '/' + G.game_length_in_turns
			);
}

function init_player_turn_page($pg)
{
	set_game_state_summary($pg);

	init_history_pane($('.history_container', $pg));
	$('.in_action_phase', $pg).show();
	$('.in_infection_phase', $pg).hide();

	if (G.roles[G.active_player] == 'Troubleshooter') {
		$('.troubleshooter_only', $pg).show();
		$('.troubleshooter_card_list', $pg).empty();

		var eff_infection_rate = G.travel_ban ? 1 : G.infection_rate;
		for (var i = 0; i < eff_infection_rate; i++) {
			var c = G.infection_deck[G.infection_deck.length-1-i];
			if (c) {
				$('.troubleshooter_card_list', $pg).append(
					make_infection_card_li(c)
				);
			}
		}
	}
	else {
		$('.troubleshooter_only', $pg).hide();
	}

	set_buttons_visibility($pg);
	set_continue_btn_caption($pg);
}

function begin_turn()
{
	var $pg = show_page('player_turn_page');
	init_player_turn_page($pg);
}

function init_draw_cards_page($pg)
{
	set_game_state_summary($pg);

	init_history_pane($('.history_container', $pg));
	$('.in_action_phase', $pg).hide();
	$('.in_infection_phase', $pg).hide();

	set_buttons_visibility($pg);
	set_continue_btn_caption($pg);
}

function can_continue()
{
	var at_end_of_game = (
		G.step == 'actions' &&
		G.turns >= G.game_length_in_turns);

	return G.has_control && !at_end_of_game;
}

function can_draw_sequence_card()
{
	return G.has_control && G.rules.lab_challenge && G.step == 'actions';
}

function can_play_special_event()
{
	return G.has_control && G.has_any_special_event();
}

function can_retrieve_special_event()
{
	return G.has_control && !G.contingency_event && G.roles[G.active_player] == 'Contingency Planner' && G.step == 'actions';
}

function can_declare_victory()
{
	return G.has_control && G.step == 'actions';
}

function can_admit_defeat()
{
	var at_end_of_game = (
		G.step == 'actions' &&
		G.turns >= G.game_length_in_turns);
	var getting_infected = (
		G.step == 'infection' || G.step == 'epidemic'
		);

	return G.has_control && (at_end_of_game || getting_infected);
}

function set_buttons_visibility($pg)
{
	if (can_draw_sequence_card()) {
		$('.draw_sequence_card_button_container', $pg).show();
	}
	else {
		$('.draw_sequence_card_button_container', $pg).hide();
	}

	if (can_play_special_event()) {
		$('.play_special_event_button_container', $pg).show();
	}
	else {
		$('.play_special_event_button_container', $pg).hide();
	}

	if (can_retrieve_special_event()) {
		$('.retrieve_special_event_button_container', $pg).show();
	}
	else {
		$('.retrieve_special_event_button_container', $pg).hide();
	}

	if (can_declare_victory()) {
		$('.victory_button_container', $pg).show();
	}
	else {
		$('.victory_button_container', $pg).hide();
	}

	if (can_admit_defeat()) {
		$('.defeat_button_container', $pg).show();
	}
	else {
		$('.defeat_button_container', $pg).hide();
	}

	if (can_continue()) {
		$('.continue_button_container', $pg).show();
	}
	else {
		$('.continue_button_container', $pg).hide();
	}
}

function set_continue_btn_caption($pg)
{
	$('.goto_draw_cards_btn', $pg).hide();
	$('.goto_mutation_btn', $pg).hide();
	$('.goto_epidemic_btn', $pg).hide();
	$('.goto_virulent_strain_btn', $pg).hide();
	$('.goto_hinterlands_btn', $pg).hide();
	$('.goto_infection_btn', $pg).hide();
	$('.goto_player_turn_btn', $pg).hide();

	if (G.step == 'actions') {
        $('.goto_draw_cards_btn', $pg).show();
	}
	else if (G.pending_mutations.length > 0) {
		$('.goto_mutation_btn', $pg).show();
	}
	else if (G.pending_epidemics > 0) {
		$('.goto_epidemic_btn', $pg).show();
	}
	else if (G.step == "epidemic" && G.rules.virulent_strain && !G.virulent_strain) {
		$('.goto_virulent_strain_btn', $pg).show();
	}
	else if (G.pending_infection > 0) {
		$('.goto_infection_btn', $pg).show();
	}
	else if ((G.step == 'draw_cards' || G.step == 'epidemic' || G.step == 'mutation') && !G.one_quiet_night) {
		if (G.rules.hinterlands_challenge) {
			$('.goto_hinterlands_btn', $pg).show();
		}
		else {
			$('.goto_infection_btn', $pg).show();
		}
	}
	else {
		$('.goto_player_turn_btn', $pg).show();

		$('.goto_player_turn_btn .player_name', $pg).text(
			G.player_names[
				1+(G.active_player%G.rules.player_count)
				]);
	}
}

function init_epidemic_page($pg)
{
	set_game_state_summary($pg);

	init_history_pane($('.history_container', $pg));
	$('.in_action_phase', $pg).hide();
	$('.in_infection_phase', $pg).show();
	$('.pending_infection_div', $pg).hide();

	set_buttons_visibility($pg);
	set_continue_btn_caption($pg);
}

function is_epidemic(c)
{
	return (/^Epidemic/).test(c);
}

function is_mutation(c)
{
	var m = /^Mutation(?:{\d+})?: (.*)/.exec(c);
	if (!m) {
		return null;
	}
	else {
		return m[1];
	}
}

function is_emergency(c)
{
	var m = /^Emergency(?:{\d+})?: (.*)/.exec(c);
	if (!m) {
		return null;
	}
	else {
		return m[1];
	}
}

function is_special(c)
{
	if (Pandemic.Cities[c]) {
		return false;
	}
	if (c == 'Epidemic') {
		return false;
	}
	if (is_epidemic(c)) {
		return false;
	}
	if (is_mutation(c)) {
		return false;
	}
	if (is_emergency(c)) {
		return false;
	}
	return true;
}

function init_infection_page($pg)
{
	set_game_state_summary($pg);

	init_history_pane($('.history_container', $pg));
	$('.in_action_phase', $pg).hide();
	$('.in_infection_phase', $pg).show();

	if (G.pending_infection > 0) {
		$('.pending_infection_div', $pg).show();
		$('.pending_infection_count', $pg).text(G.pending_infection);
	}
	else {
		$('.pending_infection_div', $pg).hide();
	}

	set_buttons_visibility($pg);
	set_continue_btn_caption($pg);
}

function show_blank_page()
{
	$(".page").hide();
}

function show_page(page_name)
{
	S.currentPage = page_name;
	$(".page").hide();
	return $("#"+page_name).show();
}

function stor_add_to_set(key, value)
{
	var a = stor_get_list(key);
	var found = false;
	for (var i = 0; i < a.length; i++) {
		if (a[i] == value) {
			return false;
		}
	}
	a.push(value);
	localStorage.setItem(key, a.join(','));
	return true;
}

function stor_remove_from_set(key, value)
{
	var a = stor_get_list(key);
	var found = false;
	for (var i = 0; i < a.length; i++) {
		if (a[i] == value) {
			a.splice(i, 1);
			localStorage.setItem(key, a.join(','));
			return true;
		}
	}
	return false;
}

function stor_get_list(key)
{
	var s = localStorage.getItem(key);
	if (s) {
		return s.split(/,/);
	}
	else {
		return [];
	}
}

function make_modules_label(rules)
{
	var $m = $('<span></span>');
	for (var i = 0; i < Pandemic.Expansions.length; i++) {
		var expansion_name = Pandemic.Expansions[i];
		if (rules[expansion_name]) {
			var $t = $('<span class="expansion_ind"><img src=""></span>');
			$('img', $t).attr('src', 'images/'+expansion_name+'.png');
			$('img', $t).attr('alt', expansion_name);
			$m.append($t);
		}
	}
	for (var i = 0; i < Pandemic.Module_Names.length; i++) {
		var module_name = Pandemic.Module_Names[i];
		if (rules[module_name]) {
			var $t = $('<span class="module_ind"><img src=""></span>');
			$('img', $t).attr('src', 'images/module_icons/'+module_name+'.png');
			$('img', $t).attr('alt', module_name);
			$m.append($t);
		}
	}
	return $m;
}

function make_scenario_label(scenario_id)
{
	var m;
	if (m = scenario_id.match(/^(\d\d\d\d)-(\d\d-\d\d)(?:\.(.*))?$/)) {
		var $s = $('<span class="scenario_name new_scenario_name"></span>');
		$s.append(m[2]);
		$s.append('<br>');
		$s.append(m[1]);
		if (m[3]) {
			$s.append('<br>');
			$s.append(m[3]);
		}
		return $s;
	}

	var parts = scenario_name(scenario_id).split(/ /);
	var $s = $('<span class="scenario_name"></span>');
	for (var i = 0; i < parts.length; i++) {
		if (i!=0) { $s.append('<br>'); }
		$s.append(parts[i]);
	}
	return $s;
}

function scenario_name(scenario_id)
{
	var m;
	if (m = scenario_id.match(/^(\d\d\d\d)-(\d\d-\d\d)(?:\.(.*))?$/)) {
		return scenario_id;
	}

	var A = parseInt(scenario_id.substring(0,6), 16);
	var i = Math.floor(A * WORDS.length / 0x1000000);

	var B = parseInt(scenario_id.substring(6,12), 16);
	var j = Math.floor(B * WORDS.length / 0x1000000);

	var C = parseInt(scenario_id.substring(12,18), 16);
	var k = Math.floor(C * WORDS.length / 0x1000000);

	return WORDS[i]+' '+WORDS[j]+' '+WORDS[k];
}

function generate_new_game_id(scenario_id)
{
	var tmp = Math.random()+'-'+Math.random()+'-'+
		JSON.stringify(G.player_names)+'-'+
		scenario_id;
	return (""+CryptoJS.SHA1(tmp)).substring(0,18);
}

function on_pick_scenario_scenario_clicked(evt)
{
	var el = this;
	var scenario_id = el.getAttribute('data-scenario-id');

	// create game
	G = load_scenario(scenario_id);
	G.game_id = generate_new_game_id(scenario_id);
	console.log("new game id is "+G.game_id);

	localStorage.setItem(PACKAGE + '.game.' + G.game_id + '.scenario', G.scenario_id);
	localStorage.setItem(PACKAGE + '.scenario.' + G.scenario_id + '.current_game', G.game_id);

	G = load_game(G.game_id);
	start_publishing_game(G.game_id);

	goto_state(G.game_id+'/player_setup');
}

function navigate_to_current_turn()
{
	goto_state(G.game_id + '/T' + G.time);
	return;
}

function scenario_finished(scenario_id)
{
	return (localStorage.getItem(PACKAGE + '.scenario.' + scenario_id + '.finished') != null);
}

function scenario_started(scenario_id)
{
	return (localStorage.getItem(PACKAGE + '.scenario.' + scenario_id + '.first_played') != null);
}

function scenario_finish_time(scenario_id)
{
	return localStorage.getItem(PACKAGE + '.scenario.' + scenario_id + '.finished');
}

function scenario_first_played_time(scenario_id)
{
	return localStorage.getItem(PACKAGE + '.scenario.' + scenario_id + '.first_played');
}

function format_time(timestr)
{
	var today = new Date();
	var d = new Date();
	d.setTime(Date.parse(timestr));
	var minutesAgo = Math.ceil((today.getTime() - d.getTime()) / 60000);

	if (minutesAgo <= 1) {
		return '1 minute ago';
	}
	else if (minutesAgo < 75) {
		return minutesAgo+' minutes ago';
	}

	var dstr = timestr.substring(0,10);
	var todaystr = today.toISOString().substring(0,10);
	if (dstr == todaystr) {
		var hoursAgo = Math.round(minutesAgo/60);
		if (hoursAgo < 2) {
			return "1 hour ago";
		} else {
			return hoursAgo + " hours ago";
		}
	}

	// drop the time components
	today.setSeconds(0);
	today.setMinutes(0);
	today.setHours(12);
	d.setSeconds(0);
	d.setMinutes(0);
	d.setHours(12);

	var daysAgo = Math.round((today.getTime() - d.getTime()) / 1000 / 86400);
	if (daysAgo == 1) {
		return "Yesterday";
	}
	else if (daysAgo < 5) {
		return daysAgo + " days ago";
	}
	else {
		return dstr;
	}
}

function generate_secret(indata)
{
	var tmp = (indata ? indata : '')+Math.random();
	return (""+CryptoJS.SHA1(tmp)).substring(0,18);
}

function start_publishing_game(game_id)
{
	localStorage.setItem(PACKAGE + '.current_game', game_id);
	localStorage.setItem(PACKAGE + '.current_game.scenario', G.scenario_id);
	localStorage.removeItem(PACKAGE + '.current_game.published');

	localStorage.setItem(PACKAGE + '.game.'+game_id+'.owner_secret', generate_secret(game_id));

	trigger_upload_game_state();
}

function set_move(m)
{
	$('body').controller().set_move_x(m);
}

function order_infection_discards()
{
	var A = [];
	for (var i = 0; i < G.infection_discards.length; i++) {
		A.push(G.infection_discards[i]);
	}
	A.sort(function(a,b) {

		if (is_mutation(a) && is_mutation(b)) {
			return 0;
		}
		else if (is_mutation(a)) {
			return -1;
		}
		else if (is_mutation(b)) {
			return 1;
		}

		var a_ci = Pandemic.Cities[a];
		var b_ci = Pandemic.Cities[b];
		if (a_ci.color != b_ci.color) {
			return a_ci.color > b_ci.color ? 1 : -1;
		}
		else {
			return a_ci.name > b_ci.name ? 1 :
				a_ci.name < b_ci.name ? -1 : 0;
		}
		});
	return A;
}

function init_forecast_page($pg)
{
	var pick_city = function(c) {
		$('.forecast_cards_list',$pg).prepend(make_infection_card_li(c));
	};

	var on_forecast_city_selected = function() {
		var c = this.getAttribute('data-city-name');
		pick_city(c);

		var $s = $('.city_btn_row:has([data-city-name="'+c+'"])', $pg);
		$s.remove();

		var left = $('.city_btn_row:not(.template)', $pg);
		if (left.length == 1) {

			left.each(function(idx,el) {
				var c = $('button',el).attr('data-city-name');
				pick_city(c);
				});
			left.remove();
			$('.choosing', $pg).hide();
			$('.confirming', $pg).show();
		}

		$('.reset_btn_container', $pg).show();
	};

	$('.forecast_cards_list', $pg).empty();

	$('.city_btn_row:not(.template)',$pg).remove();
	for (var i = 0; i < 6; i++) {
		var c = G.infection_deck[G.infection_deck.length-1-i];
		if (!c) { continue; }

		var $s = $('.city_btn_row.template', $pg).clone();

		$('button', $s).append(make_infection_card(c));
		$('button', $s).attr('data-city-name', c);
		$('button', $s).click(on_forecast_city_selected);
		$s.removeClass('template');
		$('.reset_btn_container', $pg).before($s);
	}
	$('.choosing', $pg).show();
	$('.confirming', $pg).hide();
	$('.reset_btn_container', $pg).hide();
}

function init_resource_planning_page($pg)
{
	var pick_card = function(c) {
		$('.resource_planning_cards_list',$pg).prepend(make_player_card_li(c));
	};

	var on_resource_planning_card_selected = function() {
		var c = this.getAttribute('data-card-name');
		pick_card(c);

		var $s = $('.card_btn_row:has([data-card-name="'+c+'"])', $pg);
		$s.remove();

		var left = $('.card_btn_row:not(.template)', $pg);
		if (left.length == 1) {

			left.each(function(idx,el) {
				var c = $('button',el).attr('data-card-name');
				pick_card(c);
				});
			left.remove();
			$('.choosing', $pg).hide();
			$('.confirming', $pg).show();
		}

		$('.reset_btn_container', $pg).show();
	};

	$('.resource_planning_cards_list', $pg).empty();

	$('.card_btn_row:not(.template)',$pg).remove();
	for (var i = 0; i < 4; i++) {
		var c = G.player_deck[G.player_deck.length-1-i];
		if (!c) { continue; }

		var $s = $('.card_btn_row.template', $pg).clone();

		$('button', $s).append(make_player_card(c));
		$('button', $s).attr('data-card-name', c);
		$('button', $s).click(on_resource_planning_card_selected);
		$s.removeClass('template');
		$('.reset_btn_container', $pg).before($s);
	}
	$('.choosing', $pg).show();
	$('.confirming', $pg).hide();
	$('.reset_btn_container', $pg).hide();
}

function init_new_assignment_page($pg)
{
	$('select[name=old_role]', $pg).empty();
	for (var i = 1; i <= G.rules.player_count; i++) {
		var $o = $('<option></option>');
		$o.attr('value', G.roles[i]);
		if (i == G.active_player) { $o.attr('selected','selected'); }
		$o.text(G.roles[i]);
		$('select[name=old_role]', $pg).append($o);
	}

	$('select[name=new_role]', $pg).empty();
	var roles = get_deck('Roles', G.rules);
	for (var i = 0; i < roles.length; i++) {
		var r = roles[i];
		if (role_in_use(r)) { continue; }
		var $o = $('<option></option>');
		$o.attr('value', r);
		$o.text(r);
		$('select[name=new_role]', $pg).append($o);
	}
}

function role_in_use(r)
{
	for (var i = 1; i <= G.rules.player_count; i++) {
		if (G.roles[i] == r) { return true; }
	}
	return false;
}

function init_resilient_population_page($pg)
{
	var A = order_infection_discards();

	$('.resilient_population_btn_row:not(.template)',$pg).remove();
	for (var i = 0; i < A.length; i++) {
		var c = A[i];
		
		if (is_mutation(c)) {
			continue;
		}

		var $s = $('.resilient_population_btn_row.template',$pg).clone();
		$('button', $s).append(make_infection_card(c));
		$('button', $s).attr('data-city-name', c);
		$('button', $s).click(on_resilient_population_selected);
		$s.removeClass('template');
		$('.resilient_population_btns_container',$pg).append($s);
	}
}

function on_resilient_population_selected()
{
	var c = this.getAttribute('data-city-name');
	return set_move('special "Resilient Population" "'+c+'"');
}

function init_infection_rumor_page($pg)
{
	$('.infection_rumor_btn_row:not(.template)',$pg).remove();

	var eff_infection_rate = G.travel_ban ? 1 : G.infection_rate;
	for (var i = 0; i < eff_infection_rate; i++) {
		var c = G.infection_deck[G.infection_deck.length - 1 - i];
		if (!c) { continue; }

		var $s = $('.infection_rumor_btn_row.template', $pg).clone();

		$('button', $s).append(make_infection_card(c));
		$('button', $s).attr('data-city-name', c);
		$('button', $s).click(on_infection_rumor_selected);
		$s.removeClass('template');
		$('.infection_rumor_btns_container',$pg).append($s);
	}
}

function on_infection_rumor_selected()
{
	var c = this.getAttribute('data-city-name');
	return set_move('special "Infection Rumor" "' + c + '"');
}

function on_special_event_clicked()
{
	var s =  this.getAttribute('data-special-event');

	if (s == 'Resilient Population') {

		var $pg = show_page('resilient_population_page');
		init_resilient_population_page($pg);
		return;
	}
	if (s == 'Infection Rumor') {
		var $pg = show_page('infection_rumor_page');
		init_infection_rumor_page($pg);
		return;
	}
	else if (s == 'New Assignment') {

		var $pg = show_page('new_assignment_page');
		init_new_assignment_page($pg);
		return;
	}

	return set_move('special '+s);
}

function on_special_event_retrieve_clicked()
{
	var s =  this.getAttribute('data-special-event');

	return set_move('retrieve '+s);
}

function record_game_finished()
{
	var timestr = new Date().toISOString();
	localStorage.setItem(PACKAGE + '.game.' + G.scenario_id + '.finished', timestr);
	localStorage.setItem(PACKAGE + '.game.' + G.game_id + '.finished', timestr);
}

function init_show_discards_page($pg)
{
	$('.infection_discards_list', $pg).empty();

	for (var i = 0; i < G.infection_discards.length; i++) {
		var c = G.infection_discards[i];

		$('.infection_discards_list', $pg).append(
			make_infection_card_li(c)
			);
	}

	$('.epidemic_discards_list', $pg).empty();

	var ep_count = 0;

	for (var i = 0; i < G.player_discards.length; i++) {
		var c = G.player_discards[i];

		if (is_epidemic(c)) {
			$('.epidemic_discards_list', $pg).append(
				make_player_card_li(c)
				);
			ep_count++;
		}
	}

	if (ep_count > 0) {
		$('.virulent_epidemic_discards', $pg).show();
	}
	else {
		$('.virulent_epidemic_discards', $pg).hide();
	}
}

function init_virulent_strain_page($pg)
{
	$('.virulent_strain_btn', $pg).each(function(idx,el) {
		var disease_color = el.getAttribute('data-disease');
		if (disease_color == "purple" && !G.rules.worldwide_panic) {
			$(el).hide();
		}
		else {
			$(el).show();
		}
		});
}

function init_discover_cure_page($pg)
{
	$('.discover_cure_btn', $pg).each(function(idx,el) {
		var disease_color = el.getAttribute('data-disease');
		if (is_cured(G, disease_color) || G.is_unnecessary(disease_color)) {
			$(el).hide();
		}
		else {
			$(el).show();
		}
		});

	$('.eradicate_btn', $pg).each(function(idx,el) {
		var disease_color = el.getAttribute('data-disease');
		if (G.is_eradicated(disease_color) || !is_cured(G, disease_color) || G.is_unnecessary(disease_color)) {
			$(el).hide();
		}
		else {
			$(el).show();
		}
		});

	if (G.count_uncured_diseases() == 1 && !G.is_unnecessary('purple') && !is_cured(G, 'purple')) {
		$('.victory_button_container', $pg).show();
	}
	else {
		$('.victory_button_container', $pg).hide();
	}
}

function init_play_special_event_page($pg)
{
	$('.special_action_name').text("Play");
	$('.special_event_btn_row:not(.template)').remove();
	var specials = get_deck('Specials', G.rules);
	for (var i = 0; i < specials.length; i++) {
		var s = specials[i];
		if (!G.has_special_event(s)) {
			continue;
		}
		var $s = $('.special_event_btn_row.template').clone();
		$('button', $s).text(s);
		$('button', $s).attr('data-special-event', s);
		$('button', $s).click(on_special_event_clicked);
		$s.removeClass('template');
		$('#special_event_none_row').before($s);
	}
}

function init_retrieve_special_event_page($pg)
{
	$('.special_action_name').text("Retrieve");
	$('.special_event_btn_row:not(.template)').remove();
	var specials = get_deck('Specials', G.rules);
	for (var i = 0; i < specials.length; i++) {
		var s = specials[i];
		if (!G.discarded_special_event(s)) {
			continue;
		}
		var $s = $('.special_event_btn_row.template').clone();
		$('button', $s).text(s);
		$('button', $s).attr('data-special-event', s);
		$('button', $s).click(on_special_event_retrieve_clicked);
		$s.removeClass('template');
		$('#special_event_none_row').before($s);
	}
}

function init_found_completed_games_page($pg, search_results)
{
	$('.results_game_row:not(.template)', $pg).remove();

	var lis = search_results.results;
	for (var i = 0; i < lis.length; i++) {
		var result_id = lis[i].id;
		var r = load_result(result_id);
		if (!r) { continue; }

		var scenario_id = r.scenario_id;
		G = load_scenario(scenario_id);

		var $g = $('.results_game_row.template', $pg).clone();
		$g.removeClass('template');
		for (var pid = 1; pid <= G.rules.player_count; pid++) {
			var p_name = r['player'+pid];
			var $p_name = $('<span><img class="role_icon"><span class="player_name"></span></span>');
			$('.role_icon',$p_name).attr('src', get_role_icon(G.roles[pid]));
			$('.player_name',$p_name).text(p_name);
			$('.player_list',$g).append($p_name);
			if (pid < G.rules.player_count) {
				$('.player_list',$g).append(', ');
			}
		}

		$('.scenario_name_container', $g).append(make_scenario_label(scenario_id));
		$('.module_list_container', $g).append(make_modules_label(parse_rules(r.rules)));
		update_scenario_description($g, G.rules);
		$('.location', $g).text(r.location);
		$('.submitted', $g).text(format_time(r.time));

		$('button', $g).attr('data-scenario-id', scenario_id);
		$('button', $g).attr('data-result-id', result_id);
		$('button', $g).click(on_review_result_game_clicked);

		$('.results_game_row.template', $pg).before($g);
	}
}

function init_review_results_page($pg)
{
	$('.results_game_row:not(.template)', $pg).remove();

	var lis = stor_get_list(PACKAGE + '.my_results');
	for (var i = 0; i < lis.length; i++) {
		var result_id = lis[i];
		var r = load_result(result_id);
		if (!r) { continue; }

		var scenario_id = r.scenario_id;
		G = load_scenario(scenario_id);

		var $g = $('.results_game_row.template', $pg).clone();
		$g.removeClass('template');
		for (var pid = 1; pid <= G.rules.player_count; pid++) {
			var p_name = r['player'+pid];
			var $p_name = $('<span><img class="role_icon"><span class="player_name"></span></span>');
			$('.role_icon',$p_name).attr('src', get_role_icon(G.roles[pid]));
			$('.player_name',$p_name).text(p_name);
			$('.player_list',$g).append($p_name);
			if (pid < G.rules.player_count) {
				$('.player_list',$g).append(', ');
			}
		}

		$('.scenario_name_container', $g).append(make_scenario_label(scenario_id));
		$('.module_list_container', $g).append(make_modules_label(G.rules));
		update_scenario_description($g, G.rules);

		$('.location', $g).text(r.location);
		$('.submitted', $g).text(format_time(r.time));

		$('button', $g).attr('data-scenario-id', scenario_id);
		$('button', $g).attr('data-result-id', result_id);
		$('button', $g).click(on_review_result_game_clicked);

		$('.results_game_row.template', $pg).before($g);
	}
}

function on_review_result_game_clicked()
{
	var scenario_id = this.getAttribute('data-scenario-id');
	var result_id = this.getAttribute('data-result-id');

	// so that the correct row is highlighted
	localStorage.setItem(PACKAGE + '.my_result.' + scenario_id, result_id);

	goto_state(scenario_id + '/results');
}

function init_generate_game_page($pg, xtra)
{
	var pcount = 2;
	var m = xtra.match(/^(\d+)p$/);
	if (m) {
		pcount = m[1];
	}

	$('.player_count', $pg).text(pcount);
	document.generate_game_form.player_count.value = pcount;

	validate_modules();
}

function validate_modules()
{
	var f = document.generate_game_form;

	if (f.mutation_challenge.checked) {
		f.worldwide_panic.checked = false;
		f.worldwide_panic.disabled = true;
		f.superbug_challenge.checked = false;
		f.superbug_challenge.disabled = true;
	}
	else if (f.worldwide_panic.checked) {
		f.mutation_challenge.checked = false;
		f.mutation_challenge.disabled = true;
		f.superbug_challenge.checked = false;
		f.superbug_challenge.disabled = true;
	}
	else if (f.superbug_challenge.checked) {
		f.mutation_challenge.checked = false;
		f.mutation_challenge.disabled = true;
		f.worldwide_panic.checked = false;
		f.worldwide_panic.disabled = true;
		f.quarantines.checked = true;
		f.quarantines.disabled = true;
	}
	else {
		f.mutation_challenge.disabled = false;
		f.worldwide_panic.disabled = false;
		f.superbug_challenge.disabled = false;
		f.quarantines.disabled = false;
	}
}

function scenario_compatible(G)
{
	if (G.rules.on_the_brink && !CFG.has_on_the_brink) {
		return false;
	}
	if (G.rules.in_the_lab && !CFG.has_in_the_lab) {
		return false;
	}
	if (G.rules.state_of_emergency && !CFG.has_state_of_emergency) {
		return false;
	}

	return true;
}

function update_scenario_description($g, R)
{
	$('.epidemic_count', $g).text(R.level);
	$('.epidemic_icon', $g).attr('src', 'images/epidemic_count_icons/' + R.level + '.png');
	$('.epidemic_icon', $g).attr('alt', R.level + ' epidemics');
}

function init_pick_scenario_page($pg, xtra)
{
	var pcount = 2;
	var m = xtra.match(/^(\d+)p$/);
	if (m) {
		pcount = m[1];
	}

	document.pick_scenario_form.player_count.value = pcount;

	$('.scenario_row:not(.template)', $pg).remove();
	var a = stor_get_list(PACKAGE + '.scenarios_by_player_count.' + pcount);
	var not_shown = 0;
	for (var i = 0; i < a.length; i++) {

		G = load_scenario(a[i]);
		if (!scenario_compatible(G)) {
			not_shown++;
			continue;
		}

		var $tr = $('.scenario_row.template').clone();
		$tr.removeClass('template');
		$('.scenario_name_container',$tr).append(make_scenario_label(a[i]));
		$('button',$tr).attr('data-scenario-id', a[i]);
		$('button',$tr).click(on_pick_scenario_scenario_clicked);

		var $g = $tr;
		$('.module_list_container',$tr).append(make_modules_label(G.rules));
		update_scenario_description($tr, G.rules);

		for (var pid = 1; pid <= G.rules.player_count; pid++) {
			var $p_name = $('<span><img class="role_icon"></span>');
			$('.role_icon',$p_name).attr('src', get_role_icon(G.roles[pid]));
			$('.player_list', $g).append($p_name);
		}

		var results_info = summarize_results_for_scenario(a[i]);
		var description = 'Played '+(
			results_info.play_count == 1 ? '1 time' :
			(results_info.play_count+' times')
			);
		var played_by = results_info.played_by;
		if (played_by.length) {
			description += ' (by';
			for (var j = 0; j < played_by.length; j++) {
				description += ' ' + played_by[j];
			}
			description += ')';
		}

		description +=
			scenario_finished(a[i]) ? ('; Completed ' + format_time(scenario_finish_time(a[i]))) :
			scenario_started(a[i]) ? ('; Started ' + format_time(scenario_first_played_time(a[i]))) :
			'';
		if (results_info.maximum_score > 0 && scenario_finished(a[i])) {
			description += '; best score: '+results_info.maximum_score;
		}

		$('.scenario_status_col', $tr).text(description);

		$('.scenarios_list', $pg).append($tr);
	}

	if (not_shown != 0) {
		$('.not_shown_count', $pg).text(not_shown + (not_shown != 1 ? ' scenarios' : ' scenario'));
		$('.not_shown_list', $pg).show();
	}
	else {
		$('.not_shown_list', $pg).hide();
	}
}

function on_state_init()
{
	var path = location.hash;
	if (path && path.substring(0,1) == '#') {
		path = path.substring(1);
	}
	if (path && path.substring(0,1) == '/') {
		path = path.substring(1);
	}

	var m;
	if (!path) {
		show_page('welcome_page');
	}
	else if (path == 'clear') {
		localStorage.clear();
		location.href = BASE_URL;
		return;
	}
	else if (path == 'params') {
		show_page('create_game_page');
	}
	else if (path == 'review_results') {
		var $pg = show_page('review_results_page');
		init_review_results_page($pg);
	}
	else if (path == 'join_network_game') {
		show_page('join_game_page');
	}
	else if (path == 'options') {
		var $pg = show_page('options_page');
		init_options_page($pg);
	}
	else if (path == 'subscription') {
		show_page('subscription_page');
	}
	else if (m = path.match(/^join_network_game\/(.*)$/)) {
		var q = unescape(m[1]);
		show_blank_page();
		do_search_network_game(q);
	}
	else if (m = path.match(/^search_results\/(.*)$/)) {
		var q = unescape(m[1]);
		show_blank_page();
		do_search_results(q);
	}
	else if (m = path.match(/^([0-9a-f]+)\/watch(\/.*)?$/)) {
		var game_id = unescape(m[1]);
		var xtra = m[2];
		show_blank_page();
		do_watch_game(game_id, xtra);
	}
	else if (m = path.match(/^names\/(.*)$/)) {
		var $pg = show_page('player_names_page');
		init_player_names_page($pg, m[1]);
	}
	else if (m = path.match(/^pick_scenario\/(.*)$/)) {
		var $pg = show_page('pick_scenario_page');
		init_pick_scenario_page($pg, m[1]);
	}
	else if (m = path.match(/^generate_game\/(.*)$/)) {
		var $pg = show_page('generate_game_page');
		init_generate_game_page($pg, m[1]);
	}
	else if (m = path.match(/^([0-9a-f]+)\/deck_setup$/)) {
		var $pg = show_page('deck_setup_page');
		init_deck_setup_page($pg, m[1]);
	}
	else if (m = path.match(/^([0-9a-f]+)\/board_setup$/)) {
		var $pg = show_page('board_setup_page');
		init_board_setup_page($pg, m[1]);
	}
	else if (m = path.match(/^([0-9a-f]+)\/player_setup$/)) {
		var $pg = show_page('player_setup_page');
		init_player_setup_page($pg, m[1]);
	}
	else if (m = path.match(/^([0-9a-z.-]+)\/results$/)) {
		var $pg = show_page('results_page');
		init_results_page($pg, m[1]);
	}
	else if (m = path.match(/^([0-9a-f]+)\/T([\d-]+)(\/.*)?$/)) {
		load_game_at(m[1], m[2]);
		show_current_game(m[3]);
	}
	else {
		alert('unrecognized url');
		return;
	}
	check_screen_size();
}

function goto_state(rel_url)
{
	$('body').controller().goto_state_async(rel_url);
}

function summarize_results_for_scenario(scenario_id)
{
	var names = {};
	var best_score = 0;

	var a = stor_get_list(PACKAGE + '.game_results.' + scenario_id);
	for (var i = 0; i < a.length; i++) {

		var r = load_result(a[i]);
		if (!r) { continue; }

		for (var pid = 1; pid < 5; pid++) {
			var nam = r['player'+pid];
			if (nam) {
				names[nam] = true;
			}
		}

		if (r.score > best_score) {
			best_score = r.score;
		}
	}

	var names_list = [];
	for (var nam in names) {
		names_list.push(nam);
	}
	names_list.sort();

	return {
		'played_by': names_list,
		'maximum_score': best_score,
		'play_count': a.length
		};
}

function load_result(result_id)
{
	var VV = localStorage.getItem(PACKAGE + '.result.' + result_id);
	if (!VV) {
		return null;
	}

	var r = JSON.parse(VV);
	if (r.version != Version || !r.scenario_id) {
		return null;
	}
	return r;
}

function save_current_result(for_submission)
{
	var f = document.game_completed_form;

	localStorage.setItem(PACKAGE + '.game_location', f.location.value);

	var V = {};
	V.version = Version;
	V.rules = f.rules.value;
	V.shuffle_id = f.scenario_id.value;
	V.scenario_id = f.scenario_id.value;
	V.game_id = f.game_id.value;
	V.score = f.score.value;
	V.cures = f.cures.value;
	V.turns = f.turns.value;
	V.location = f.location.value;
	V.comments = f.comments.value;
	for (var i = 1; i <= G.rules.player_count; i++) {
		V['player'+i] = f['player'+i].value;
	}
	V.time = new Date().toISOString();
	if (!for_submission) {
		V.localOnly = true;
	}

	var VV = JSON.stringify(V);
	var result_id = (""+CryptoJS.SHA1(VV)).substring(0,18);
	localStorage.setItem(PACKAGE + '.result.' + result_id, VV);
	localStorage.setItem(PACKAGE + '.my_result.' + V.scenario_id, result_id);

	return result_id;
}

//
// BEGIN SYNCHRONIZATION CODE
//

var sync_started = false;
var pending_sync = {
	download_index: true
	};
var pending_download_scenarios=[];
var pending_download_results=[];


function trigger_sync_process()
{
	if (!sync_started) {
		continue_sync();
	}
}

function trigger_upload_game_state()
{
	pending_sync.game_state = true;
	trigger_sync_process();
}

function trigger_upload_scenario(scenario_id)
{
	stor_add_to_set(PACKAGE + '.pending_scenarios', scenario_id);
	trigger_sync_process();
}

function continue_sync()
{
	if (sync_started) {
		console.log("sync: continuing");
	} else {
		console.log("sync: starting");
		sync_started = true;
	}

	// check for pending scenarios
	var a = stor_get_list(PACKAGE + '.pending_scenarios');
	if (a.length) {
		var scenario_id = a[0];
		return upload_scenario(scenario_id);
	}

	// check for pending results
	var a = stor_get_list(PACKAGE + '.pending_results');
	if (a.length) {
		var result_id = a[0];
		return upload_result(result_id);
	}

	// does the current game need uploaded?
	if (pending_sync.game_state) {
		return upload_current_game();
	}

	if (pending_sync.download_index) {
		// console.log("sync: checking for items to download");
		check_for_downloads();
	}

	// nothing more to do
	console.log("sync: finished");
	sync_started = false;
}

function upload_scenario(scenario_id)
{
	console.log("sync: uploading scenario "+scenario_id);
	var s = localStorage.getItem(PACKAGE + '.scenario.' + scenario_id);

	var onSuccess = function(data) {
		stor_remove_from_set(PACKAGE + '.pending_scenarios', scenario_id);
		return continue_sync();
		};

	$.ajax({
	type: "POST",
	url: "s/scenarios?id="+scenario_id,
	data: s,
	contentType: "application/json; charset=utf-8",
	dataType: "json",
	success: onSuccess,
	error: handle_ajax_error
	});
}

function upload_result(result_id)
{
	// console.log("sync: uploading result "+result_id);
	var s = localStorage.getItem(PACKAGE + '.result.' + result_id);

	var onSuccess = function(data) {
		// console.log('sync: successful upload of '+result_id);
		stor_remove_from_set(PACKAGE + '.pending_results', result_id);
		return continue_sync();
		};

	$.ajax({
	type: "POST",
	url: "s/results?result="+result_id,
	data: s,
	contentType: "application/json; charset=utf-8",
	dataType: "json",
	success: onSuccess,
	error: handle_ajax_error
	});
}

function upload_current_game()
{
	delete pending_sync.game_state;

	var game_id = localStorage.getItem(PACKAGE + '.current_game');
	if (!game_id) {
		console.log("Unexpected: in upload_current_game() without a game");
		return continue_sync();
	}

	var scenario_id = localStorage.getItem(PACKAGE + '.current_game.scenario');
	var published = localStorage.getItem(PACKAGE + '.current_game.published');
	var secret = localStorage.getItem(PACKAGE + '.game.' + game_id + '.owner_secret');

	if (published) {

		// update existing game
		upload_current_game_moves(game_id, secret);
	}
	else if (secret) {

		// new game
		console.log("sync: uploading current game metadata");
		var st = {
			'scenario': scenario_id,
			'secret': secret,
			'player_count': G.rules.player_count
			};
		for (var pid = 1; pid <= G.rules.player_count; pid++) {
			st['player'+pid] = G.player_names[pid];
		}
		st.location = localStorage.getItem(PACKAGE+'.game_location');
		var s = JSON.stringify(st);

		var onSuccess = function(data) {
			game_id = data.game_id;
			// console.log('sync: successful upload of current game metadata');
			// console.log('sync: new game id is '+game_id);
			localStorage.setItem(PACKAGE + '.current_game.published', game_id);
			return upload_current_game_moves(game_id, secret);
			};

		$.ajax({
		type: "POST",
		url: "s/games?id="+escape(game_id)+'&post=meta',
		data: s,
		contentType: "application/json; charset=utf-8",
		dataType: "json",
		success: onSuccess,
		error: handle_ajax_error
		});
	}
	else {
		console.log('sync: no current game to upload');
	}
}

function upload_current_game_moves(game_id, secret)
{
	console.log("sync: uploading current game movelog");
	delete pending_sync.game_state;

	var mv_array = [];
	for (var t = 0; t < G.time; t++) {
		var mv = get_move(G.scenario_id, G.game_id, t);
		mv_array.push(mv);
	}

	var X = {
		'secret': secret,
		'time': G.time,
		'moves': mv_array
		};

	var onSuccess = function(data) {
		// console.log('sync: successful upload of current game movelog');
		return continue_sync();
		};

	$.ajax({
	type: "POST",
	url: "s/games?id="+game_id,
	data: JSON.stringify(X),
	contentType: "application/json; charset=utf-8",
	dataType: "json",
	success: onSuccess,
	error: handle_ajax_error
	});
}

function check_for_downloads()
{
	delete pending_sync.download_index;

	var onSuccess = function(data) {
		S.loginUrl = data.loginUrl;
		S.logoutUrl = data.logoutUrl;
		S.userName = data.userName;

		if (S.currentPage == 'subscription_page') {
			// TODO- refresh list of available games
			//on_state_init();
		}

		for (var i = 0; i < data.scenarios.length; i++) {
			var d = data.scenarios[i];
			if (!has_scenario(d.id)) {
				pending_download_scenarios.push(d.id);
			}
		}
		for (var i = 0; i < data.results.length; i++) {
			var d = data.results[i];
			if (!has_result(d.id)) {
				pending_download_results.push(d);
			}
		}
		return download_next_scenario();
		};

	$.ajax({
	type: "GET",
	url: "s/scenarios",
	dataType: "json",
	success: onSuccess,
	error: handle_ajax_error
	});
}

function has_scenario(scenario_id)
{
	return localStorage.getItem(PACKAGE + '.scenario.' + scenario_id) != null;
}

function has_result(result_id)
{
	return localStorage.getItem(PACKAGE + '.result.' + result_id) != null;
}

function download_next_result()
{
	if (pending_download_results.length) {
		var result_b = pending_download_results.shift();
		return download_result(result_b);
	}
	else {
		return continue_sync();
	}
}

function save_downloaded_result(result_id, result_data)
{
	if (result_data.shuffle_id && !result_data.scenario_id) {
		// old results may have only .shuffle_id
		result_data.scenario_id = result_data.shuffle_id;
	}

	var scenario_id = result_data.scenario_id;
	if (!scenario_id) {
		console.log("Warning: no scenario given for result "+result_id);
		return;
	}

	console.log('result is for scenario '+scenario_id);

	var VV = JSON.stringify(result_data);
	localStorage.setItem(PACKAGE + '.result.' + result_id, VV);
	stor_add_to_set(PACKAGE + '.game_results.' + scenario_id, result_id);
}

function download_result(result_b)
{
	var onSuccess = function(data) {
		// console.log('sync: successful download of result '+result_b.id);
		save_downloaded_result(result_b.id, data);
		return download_next_result();
		};

	// console.log('sync: downloading result '+result_b.id);
	$.ajax({
	type: "GET",
	url: "s/results?scenario="+escape(result_b.scenario)+"&result="+escape(result_b.id),
	dataType: "json",
	success: onSuccess,
	error: handle_ajax_error
	});
}

function download_next_scenario()
{
	if (pending_download_scenarios.length) {
		var scenario_id = pending_download_scenarios.shift();
		return download_scenario(scenario_id);
	}
	else {
		return download_next_result();
	}
}

function save_downloaded_scenario(scenario_id, data)
{
	var XX = JSON.stringify(data);
	localStorage.setItem(PACKAGE + '.scenario.' + scenario_id, XX);
	stor_add_to_set(PACKAGE + '.scenarios_by_rules.' + stringify_rules(data.rules), scenario_id);
	stor_add_to_set(PACKAGE + '.scenarios_by_player_count.' + data.rules.player_count, scenario_id);
}

function download_scenario(scenario_id)
{
	var onSuccess = function(data) {
		// console.log('sync: successful download of '+scenario_id);
		save_downloaded_scenario(scenario_id, data);
		return download_next_scenario();
		};

	// console.log('sync: downloading scenario '+scenario_id);
	$.ajax({
	type: "GET",
	url: "s/scenarios?id="+escape(scenario_id),
	dataType: "json",
	success: onSuccess,
	error: handle_ajax_error
	});
}

$(trigger_sync_process);

//
// END SYNCHRONIZATION CODE
//

function check_screen_size()
{
	$('.page').each(function(idx, el) {

		var $f = $('.flex_container', el);
		if ($f.length == 0) { return; }

		var h = $(el).height();
		var hh = window.innerHeight - h + $f.height() - 16;
		$('.flex_container', el).css({
			'min-height': hh+'px'
			});
	});
}

$(function() {
	window.onresize = check_screen_size;
});
