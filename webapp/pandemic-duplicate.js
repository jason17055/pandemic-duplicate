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
		Pandemic.Cities['Toronto'].name = 'Montreal';
	}
}
load_options();

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

	load_scenario(sid);

	var s = localStorage.getItem(PACKAGE + '.player_names');
	if (s) {
		G.player_names = JSON.parse(s);
	}

	G.game_id = game_id;
	init_game();
	return G;
}

function init_game()
{
	G.active_player = 1;
	G.history = [];
	G.history.push({'type':'next_turn', 'active_player':1});
	G.time = 0;
	G.turns = 1;
	G.step = 'actions';
	G.hands = {};
	G.contingency_event = null;
	for (var i = 1; i <= G.rules.player_count; i++) {
		G.hands[i] = [];
		for (var j = 0; j < G.initial_hands[i].length; j++) {
			G.hands[i].push(G.initial_hands[i][j]);
		}
	}

	G.infection_rate = 2;
	G.infection_discards = [];
	for (var i = 0; i < 9; i++) {
		var c = G.infection_deck.pop();
		G.infection_discards.push(c);
	}

	G.diseases = {}; //identifies cured/eradicated diseases
	G.epidemic_count = 0;

	G.player_discards = [];
	G.game_length_in_turns = 1+Math.floor(G.player_deck.length/2);
}

function load_scenario(shuffle_id)
{
	var s = localStorage.getItem(PACKAGE + '.scenario.' + shuffle_id);
	if (!s) {
		console.log('Fatal: scenario '+shuffle_id+' is not known');
		return;
	}

	G = JSON.parse(s);
	G.shuffle_id = shuffle_id;
	G.scenario_id = shuffle_id;
	return G;
}

function init_options_page($pg)
{
	var f = document.options_form;
	var tmp = localStorage.getItem(PACKAGE+'.base_game_version');
	f.base_game_version.value = tmp || '2007';

	f.has_on_the_brink.checked = localStorage.getItem(PACKAGE+'.has_on_the_brink')=='true';
	f.has_in_the_lab.checked = localStorage.getItem(PACKAGE+'.has_in_the_lab')=='true';
}

function save_options_form()
{
	var f = document.options_form;
	localStorage.setItem(PACKAGE+'.base_game_version', f.base_game_version.value);
	localStorage.setItem(PACKAGE+'.has_on_the_brink', f.has_on_the_brink.checked ? 'true' : 'false');
	localStorage.setItem(PACKAGE+'.has_in_the_lab', f.has_in_the_lab.checked ? 'true' : 'false');
	load_options();
}

$(function() {
	var f = document.options_form;
	f.base_game_version.onchange = save_options_form;
	f.has_on_the_brink.onchange = save_options_form;
	f.has_in_the_lab.onchange = save_options_form;
});
function init_subscription_page($pg)
{
	if (S.userName) {
		$('.not_logged_in', $pg).hide();
		$('.logged_in', $pg).show();
		$('.user_name', $pg).text(S.userName);
	}
	else {
		$('.not_logged_in', $pg).show();
		$('.logged_in', $pg).hide();
	}
}

function init_join_game_pick_page($pg, search_results)
{
	var list = search_results.results;

	$('.no_results_found').toggle(list.length == 0);

	$('.join_game_btn:not(.template)', $pg).remove();
	for (var i = 0; i < list.length; i++) {
		var g = list[i];
		if (!load_scenario(g.deal)) { continue; }

		var $g = $('.join_game_btn.template', $pg).clone();
		$g.removeClass('template');

		$('.expansion', $g).text(G.rules.expansion == 'none' ? 'Original' : G.rules.expansion);
		$('.epidemic_count', $g).text(G.rules.level);
		$('.epidemic_level_caption', $g).text(
			G.rules.level == 4 ? 'Intro' :
			G.rules.level == 5 ? 'Normal' :
			G.rules.level == 6 ? 'Heroic' :
			G.rules.level == 7 ? 'Legendary' : ''
			);

		for (var pid = 1; pid <= G.rules.player_count; pid++) {
			var p_name = g.players[pid-1];
			var $p_name = $('<span><img class="role_icon"><span class="player_name"></span></span>');
			$('.role_icon',$p_name).attr('src', get_role_icon(G.roles[pid]));
			$('.player_name',$p_name).text(p_name);
			$('.player_list', $g).append($p_name);
			if (pid < G.rules.player_count) {
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
	var u = BASE_URL + '#' + escape(game_id) + '/watch';
	history.pushState(null, null, u);
	on_state_init();
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

	G=null;
	load_scenario(game_data.deal);

	G.player_names = {};
	for (var pid = 1; pid <= game_data.players.length; pid++) {
		G.player_names[pid] = game_data.players[pid-1];
	}

	G.game_id = watched_game_info.game_id;
	init_game();
	while (G.time < game_data.moves.length) {

		var mv = game_data.moves[G.time];
		do_move(mv);
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
	else if (G.step == 'end') {
		var $pg = show_page('game_completed_page');
		init_game_completed_page($pg);
	}
	else {
		alert('unrecognized game state');
		return;
	}
}

$(function() {
	var n = localStorage.getItem(PACKAGE+'.my_player_name');
	if (n) {
		document.join_game_form.name.value = n;
	}

	$('#logging_option_btn').click(toggle_logging_option);
	var logging_enabled = localStorage.getItem(PACKAGE+'.enable_logging');
	if (logging_enabled) {
		$('.detail_level_1').show();
		$('.no_detail_level_1').hide();
		$('#logging_option_btn').text('Disable Full Logging');
	}
});

function toggle_logging_option()
{
	var logging_enabled = localStorage.getItem(PACKAGE+'.enable_logging');
	if (logging_enabled) {
		localStorage.removeItem(PACKAGE+'.enable_logging');
	}
	else {
		localStorage.setItem(PACKAGE+'.enable_logging','true');
	}
	location.reload();
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

function submit_join_game_form()
{
	var f = document.join_game_form;
	var name = f.name.value;

	localStorage.setItem(PACKAGE+'.my_player_name', name);

	var u = BASE_URL + '#join_network_game/' + escape(name);
	history.pushState(null, null, u);
	on_state_init();
	return false;
}

function cancel_join_game_pick()
{
	history.back();
}

function submit_search_results_form()
{
	var f = document.search_results_form;
	var q = f.q.value;

	var u = BASE_URL + '#search_results/' + escape(q);
	history.pushState(null, null, u);
	on_state_init();
	return false;
}

function init_welcome_page($pg)
{
	var shuffle_id = localStorage.getItem(PACKAGE + '.current_game.scenario');

	if (shuffle_id == null) {
		$('.resume_game_btn', $pg).attr('disabled', 'disabled');
	}
	else {
		$('.resume_game_btn', $pg).removeAttr('disabled');
	}
}

function submit_create_game_form()
{
	var f = document.create_game_form;
	var pcount = f.player_count.value;
	var u = BASE_URL + '#names/' + pcount + 'p';
	history.pushState(null, null, u);
	on_state_init();
	return false;
}

function submit_generate_game_form()
{
	var f = document.generate_game_form;
	var rules = {
		'player_count': +f.player_count.value,
		'expansion': f.expansion.value,
		'level': +f.level.value
		};
	G = generate_scenario(rules);

	// create game
	G.game_id = generate_new_game_id(G.scenario_id);
	console.log("new game id is "+G.game_id);

	localStorage.setItem(PACKAGE + '.game.' + G.game_id + '.scenario', G.scenario_id);
	localStorage.setItem(PACKAGE + '.scenario.' + G.scenario_id + '.current_game', G.game_id);

	load_game(G.game_id);
	start_publishing_game(G.game_id);

	var u = BASE_URL + '#'+G.game_id+'/player_setup';
	history.pushState(null, null, u);
	on_state_init();
	return false;
}

function generate_game_clicked()
{
	var pcount = document.pick_scenario_form.player_count.value;
	var u = BASE_URL + '#generate_game/' + pcount + 'p';
	history.pushState(null, null, u);
	on_state_init();
}

function init_player_names_page($pg, xtra)
{
	var pcount = 2;
	var m = xtra.match(/^(\d+)p$/);
	if (m) {
		pcount = +m[1];
	}

	G = {};
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
	$('.turns', $pg).text(G.turns);
	$('.turns_left', $pg).text(Math.floor(G.player_deck.length/2));
	$('.level', $pg).text(G.rules.level);
	if (G.result == 'victory') {
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

	var f = document.game_completed_form;
	f.location.value = localStorage.getItem(PACKAGE + '.game_location');
	f.rules.value = stringify_rules(G.rules);
	f.shuffle_id.value = G.shuffle_id;
}

function submit_player_names_form()
{
	var f = document.player_names_form;
	var pcount = +f.player_count.value;
	G = {};
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

	history.pushState(null, null, BASE_URL + '#pick_scenario/' + pcount + 'p');
	on_state_init();
	return false;
}

function save_player_names()
{
	localStorage.setItem(PACKAGE+'.player_names',
		JSON.stringify(G.player_names)
		);
}

function init_deck_setup_page($pg, shuffle_id)
{
	load_scenario(shuffle_id);

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

function continue_after_deck_setup()
{
	var u = BASE_URL + '#'+G.shuffle_id+'/board_setup';
	history.pushState(null, null, u);
	on_state_init();

	return false;
}

function init_board_setup_page($pg, game_id)
{
	load_game(game_id);

	$('.3cube_cities').empty();
	for (var i = 0; i < 3; i++) {
		var c = G.infection_discards[i];
		$('.3cube_cities').append(make_infection_card_li(c));
	}

	$('.2cube_cities').empty();
	for (var i = 3; i < 6; i++) {
		var c = G.infection_discards[i];
		$('.2cube_cities').append(make_infection_card_li(c));
	}

	$('.1cube_cities').empty();
	for (var i = 6; i < G.infection_discards.length; i++) {
		var c = G.infection_discards[i];
		$('.1cube_cities').append(make_infection_card_li(c));
	}
}

function continue_after_board_setup()
{
	return navigate_to_current_turn();
}

function init_player_setup_page($pg, game_id)
{
	load_game(game_id);

	$('.scenario_name',$pg).text(scenario_name(G.scenario_id));

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
		if (G.player_names) {
			$('.player'+i+' .player_name', $pg).text(G.player_names[i]);
		}
		$('.player'+i+' .role', $pg).text(G.roles[i]);
		$('.player'+i+' .role_icon', $pg).attr('src', get_role_icon(G.roles[i]));
		$('.player'+i+' .card_list', $pg).empty();
		for (var j = 0; j < G.initial_hands[i].length; j++) {
			var c = G.initial_hands[i][j];
			var $c = make_player_card_li(c);
			$('.player'+i+' .card_list', $pg).append($c);
		}
	}
}

function init_results_page($pg, shuffle_id)
{
	load_scenario(shuffle_id);
	
	$('.scenario_name', $pg).text(scenario_name(shuffle_id));

	var all_result_ids = stor_get_list(PACKAGE + '.game_results.' + shuffle_id);
	var my_result_id = localStorage.getItem(PACKAGE + '.my_result.' + shuffle_id);
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
		if (!r || r.version != Version) { continue; }
		if (r.shuffle_id != shuffle_id) { continue; }

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
	else {
		$('.card_name', $x).text(c);
		$('.card_icon', $x).attr('src', 'special_event_icon.png');
		$x.addClass('special_card');
	}

	return $x;
}

function make_infection_card(c)
{
	var ci = Pandemic.Cities[c];

	var $x = $('<span class="infection_card"><img src="" class="card_icon"><span class="card_name"></span></span>');
	$('.card_name', $x).text(ci.name);
	$('.card_icon', $x).attr('src', ci.color+'_icon.png');
	$x.addClass(ci.color + '_card');
	return $x;
}

function make_infection_card_li(c)
{
	var $x = $('<li></li>');
	$x.append(make_infection_card(c));
	$x.attr('data-city-name', c);
	return $x;
}

function continue_after_player_setup()
{
	var u = BASE_URL + '#'+G.game_id+'/board_setup';
	history.pushState(null, null, u);
	on_state_init();

	return false;
}

function load_game_at(game_id, target_time)
{
	G=null;
	load_game(game_id);

	target_time = +target_time;
	while (G.time < target_time) {

		var mv = get_move(G.shuffle_id, G.time);
		do_move(mv);
	}

	G.has_control = true;

	var prior_time = localStorage.getItem(PACKAGE + '.game.' + game_id + '.time');
	if (G.time != +prior_time) {
		localStorage.setItem(PACKAGE + '.game.' + game_id + '.time', G.time);
		trigger_upload_game_state();
	}
}

function get_move(game_id, time)
{
	var mv = localStorage.getItem(PACKAGE + '.game.' + game_id + '.T' + time);
	return mv != null ? mv : 'pass';
}

function start_epidemic()
{
	G.step = 'epidemic';
	G.time++;

	G.epidemic_count++;
	G.infection_rate = G.epidemic_count < 3 ? 2 :
			G.epidemic_count < 5 ? 3 : 4;

	var c = G.infection_deck.shift();
	G.current = {
		'epidemic': c
		};
	G.history.push({
		'type': 'epidemic',
		'epidemic': c
		});
	G.pending_epidemics--;

	G.infection_discards.push(c);
}

// Note: this function is called when the user clicks Next after an
// epidemic is processed.
// It is *also* called when a Forecast special event is played, as the
// Forecast is interested in the infection deck after the cards are
// reshuffled.
// In the case of Forecast, this function is called MULTIPLE times,
// the second time the infection discard pile is empty, so it has no
// effect.
//
function finish_epidemic()
{
	var a = G['epidemic.'+G.epidemic_count];
	if (!a) {
		alert('Oops, this game does not have an order defined for epidemic '+G.epidemic_count);
		return;
	}

	for (var i = a.length-1; i >= 0; i--) {

		var c = find_and_remove_card(G.infection_discards, a[i]);
		if (c) {
			G.infection_deck.push(c);
		}
	}
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

function do_more_infection()
{
	if (G.pending_infection > 0) {

		G.step = 'infection';
		G.time++;

		var c = G.infection_deck.pop();
		G.current = {
			'infection': c
			};
		G.history.push({
			'type': 'infection',
			'infection': c
			});
		G.infection_discards.push(c);
		G.pending_infection--;
	}
	else {

		G.active_player = G.active_player % G.rules.player_count + 1;
		G.history.push({
			'type': 'next_turn',
			'active_player': G.active_player
			});
		G.step = 'actions';
		G.time++;
		G.turns++;
	}
}

function make_history_item(evt)
{
	if (evt.type == 'infection') {
		var $e = $('<div class="infection_event"></div>');
		$e.append(make_infection_card(evt.infection));
		$e.append(' is infected (add 1 cube)');
		return $e;
	}
	else if (evt.type == 'epidemic') {
		var $e = $('<div class="epidemic_event"></div>');
		$e.append(make_infection_card(evt.epidemic));
		$e.append(' is infected (<em>add 3 cubes!</em>)');
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
		$('.card_container',$e).append(make_player_card('Epidemic'));
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
	else if (evt.type == 'resilient_population') {
		var $e = $('<div class="resilient_population_event">&nbsp; --> <span class="card_container"></span> is made resilient</div>');
		$('.card_container',$e).append(make_infection_card(evt.city));
		return $e;
	}
	else {
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
	'Quarantine Specialist': 'quarantine_specialist_role_icon.png'
	};
function get_role_icon(r)
{
	return 'images/'+Role_icons[r];
}

function start_infection()
{
	if (G.travel_ban) {
		G.travel_ban--;
		G.pending_infection = 1;
	}
	else if (G.one_quiet_night) {
		delete G.one_quiet_night;
		G.pending_infection = 0;
	}
	else {
		G.pending_infection = G.infection_rate;
	}
	do_more_infection();
}

function do_move(m)
{
	//console.log("m["+G.time+"]="+m);
	//debug_infection_discards();

	var mm = m.split(/ /);
	if (m == 'pass') {

		if (G.step == 'actions') {

			// end of actions phase
			G.step = 'draw_cards';
			G.time++;

			// draw two player cards
			var c1 = G.player_deck.pop();
			var c2 = G.player_deck.pop();
			G.current = {
				'cards_drawn': [c1, c2]
				};

			G.pending_epidemics = 0;
			if (is_epidemic(c1)) {
				G.pending_epidemics++;
				G.history.push({
					'type': 'draw_epidemic',
					'epidemic_count': G.epidemic_count+G.pending_epidemics
					});
			}
			else {
				G.hands[G.active_player].push(c1);
				G.history.push({
					'type': 'draw_card',
					'player': G.active_player,
					'card': c1
					});
			}

			if (is_epidemic(c2)) {
				G.pending_epidemics++;
				G.history.push({
					'type': 'draw_epidemic',
					'epidemic_count': G.epidemic_count+G.pending_epidemics
					});
			}
			else {
				G.hands[G.active_player].push(c2);
				G.history.push({
					'type': 'draw_card',
					'player': G.active_player,
					'card': c2
					});
			}

		}
		else if (G.step == 'draw_cards') {

			if (G.pending_epidemics > 0) {
				start_epidemic();
			}
			else {
				start_infection();
			}
		}
		else if (G.step == 'epidemic') {

			finish_epidemic();
			if (G.pending_epidemics > 0) {
				start_epidemic();
			}
			else {
				start_infection();
			}
		}
		else { // infection

			do_more_infection();
		}
	}
	else if (mm[0] == 'special') {
		do_special_event(m.substring(8));
	}
	else if (mm[0] == 'retrieve') {
		do_retrieve_special_event(m.substring(9));
	}
	else if (mm[0] == 'discover') {
		do_discover_cure(mm[1]);
	}
	else if (mm[0] == 'forecast') {
		do_forecast(m.substring(9));
	}
	else if (m == 'give_up') {
		G.step = 'end';
		G.result = 'loss'
		G.time++;
	}
	else if (m == 'claim_victory') {
		G.step = 'end';
		G.result = 'victory';
		G.time++;
	}
	else {

		console.log("unrecognized move: "+m);
		G.time++;
	}
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

function do_forecast(s)
{
	var cardlist = [];
	var m;
	while (m = /^"([^"]+)"\s*(.*)$/.exec(s)) {
		cardlist.push(m[1]);
		s = m[2];
	}

	for (var i = 0; i < cardlist.length; i++) {
		G.infection_deck.pop();
	}
	for (var i = cardlist.length-1; i >= 0; i--) {
		G.infection_deck.push(cardlist[i]);
	}

	G.time++;
	G.step = G.after_forecast_step;
	delete G.after_forecast_step;
}

function do_special_event(c)
{
	var hfun = function(cc) {
		var pid = null;
		if (G.contingency_event == cc) {
			for (var i = 1; i <= G.rules.player_count; i++) {
				if (G.roles[i] == 'Contingency Planner') {
					pid = i;
					break;
				}
			}
			if (pid) {
				G.contingency_event = null;
			}
		}
		else {
			pid = find_and_remove_card_any_hand(cc);
		}
		if (!pid) { return null; }

		G.history.push({
			'type':'special_event',
			'player':pid,
			'card':cc
			});
		return pid;
	};

	var m;
	if (c == 'One Quiet Night') {
		if (hfun(c)) {
			G.one_quiet_night = 1;
		}
	}
	else if (c == 'Commercial Travel Ban') {
		if (hfun(c)) {
			G.travel_ban = G.rules.player_count;
		}
	}
	else if (c == 'Forecast') {
		if (hfun(c)) {
			if (G.step == 'epidemic') {
				finish_epidemic();
			}
			G.after_forecast_step = G.step;
			G.step = 'forecast';
		}
	}
	else if (m = /^"Resilient Population" "(.*)"$/.exec(c)) {
		if (hfun("Resilient Population")) {
			find_and_remove_card(G.infection_discards, m[1]);
			G.history.push({
				'type':'resilient_population',
				'city':m[1]
				});
		}
	}
	else if (m = /^"New Assignment" "([^"]*)" "([^"]*)"$/.exec(c)) {
		if (hfun("New Assignment")) {
			for (var i = 1; i <= G.rules.player_count; i++) {
				if (G.roles[i] == m[1]) {
					G.roles[i] = m[2];
					break;
				}
			}
			if (m[1] == 'Contingency Planner' && G.contingency_event) {
				G.player_discards.push(G.contingency_event);
				G.contingency_event = null;
			}
		}
	}
	else {
		hfun(c);
	}

	G.time++;
}

function do_retrieve_special_event(c)
{
	var pid = G.active_player;
	if (!find_and_remove_card(G.player_discards, c))
		return null;
	if (G.contingency_event)
		return null;

	G.contingency_event = c;

	G.history.push({
		'type':'retrieve_special_event',
		'player':pid,
		'card':c
		});

	G.time++;
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

function continue_player_turn()
{
	set_move('pass');
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

function can_play_special_event()
{
	return G.has_control;
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
	if (G.step == 'actions') {
		$('.goto_draw_cards_btn', $pg).show();
		$('.goto_epidemic_btn', $pg).hide();
		$('.goto_infection_btn', $pg).hide();
		$('.goto_player_turn_btn', $pg).hide();
	}
	else if (G.pending_epidemics > 0) {
		$('.goto_draw_cards_btn', $pg).hide();
		$('.goto_epidemic_btn', $pg).show();
		$('.goto_infection_btn', $pg).hide();
		$('.goto_player_turn_btn', $pg).hide();
	}
	else if (G.pending_infection > 0 || (
			(G.step == 'draw_cards' || G.step == 'epidemic') && !G.one_quiet_night)) {
		$('.goto_draw_cards_btn', $pg).hide();
		$('.goto_epidemic_btn', $pg).hide();
		$('.goto_infection_btn', $pg).show();
		$('.goto_player_turn_btn', $pg).hide();
	}
	else {
		$('.goto_draw_cards_btn', $pg).hide();
		$('.goto_epidemic_btn', $pg).hide();
		$('.goto_infection_btn', $pg).hide();
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
	return c == 'Epidemic';
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

function on_preshuffled_game_clicked(evt)
{
	var el = this;
	var shuffle_id = el.getAttribute('data-shuffle-id');

	// create game
	load_scenario(shuffle_id);
	G.game_id = generate_new_game_id(shuffle_id);
	console.log("new game id is "+G.game_id);

	localStorage.setItem(PACKAGE + '.game.' + G.game_id + '.scenario', G.scenario_id);
	localStorage.setItem(PACKAGE + '.scenario.' + G.scenario_id + '.current_game', G.game_id);

	load_game(G.game_id);
	start_publishing_game(G.game_id);

	var u = BASE_URL + '#'+G.game_id+'/player_setup';
	history.pushState(null, null, u);
	on_state_init();
}

function navigate_to_current_turn()
{
	var u = BASE_URL + '#' + G.game_id + '/T' + G.time;
	history.pushState(null, null, u);
	on_state_init();
	return;
}

function deal_finished(deal_id)
{
	return (localStorage.getItem(PACKAGE + '.game.' + deal_id + '.finished') != null);
}

function deal_started(deal_id)
{
	return (localStorage.getItem(PACKAGE + '.game.' + deal_id + '.first_played') != null);
}

function deal_finish_time(deal_id)
{
	return localStorage.getItem(PACKAGE + '.game.' + deal_id + '.finished');
}

function deal_first_played_time(deal_id)
{
	return localStorage.getItem(PACKAGE + '.game.' + deal_id + '.first_played');
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
	var timestr = new Date().toISOString();
	localStorage.setItem(PACKAGE + '.game.' + G.shuffle_id + '.last_played', timestr);
	if (localStorage.getItem(PACKAGE + '.game.' + G.shuffle_id + '.first_played') == null) {
		localStorage.setItem(PACKAGE + '.game.' + G.shuffle_id + '.first_played', timestr);
	}

	localStorage.setItem(PACKAGE + '.game.' + G.shuffle_id + '.T' + G.time, m);

	do_move(m);
	navigate_to_current_turn();
	return;
}

function order_infection_discards()
{
	var A = [];
	for (var i = 0; i < G.infection_discards.length; i++) {
		A.push(G.infection_discards[i]);
	}
	A.sort(function(a,b) {

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

function on_forecast_reset_clicked()
{
	init_forecast_page($('#forecast_page'));
}

function on_forecast_confirm_clicked()
{
	var sel = [];
	$('#forecast_page .forecast_cards_list li').each(function(idx,el) {
		var c = el.getAttribute('data-city-name');
		sel.push(c);
		});

	var m = "forecast";
	for (var i = 0; i < sel.length; i++) {
		m += ' "' + sel[i] + '"';
	}

	return set_move(m);
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
	for (var i = 0; i < Pandemic.Roles.length; i++) {
		var r = Pandemic.Roles[i];
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

function on_new_assignment_confirmed()
{
	var f = document.new_assignment_form;
	var old_role = f.old_role.value;
	var new_role = f.new_role.value;
	set_move('special "New Assignment" "'+old_role+'" "'+new_role+'"');
	return;
}

function init_resilient_population_page($pg)
{
	var A = order_infection_discards();

	$('.resilient_population_btn_row:not(.template)',$pg).remove();
	for (var i = 0; i < A.length; i++) {
		var c = A[i];

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

function on_special_event_clicked()
{
	var s =  this.getAttribute('data-special-event');

	if (s == 'Resilient Population') {

		var $pg = show_page('resilient_population_page');
		init_resilient_population_page($pg);
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

function has_special_event(s)
{
	if (G.contingency_event == s)
		return true;

	for (var pid in G.hands) {
		var h = G.hands[pid];
		for (var i = 0; i < h.length; i++) {
			if (h[i] == s) {
				return true;
			}
		}
	}
	return false;
}

function discarded_special_event(s)
{
	for (var i = 0; i < G.player_discards.length; i++) {
		if (G.player_discards[i] == s) {
			return true;
		}
	}
	return false;
}

function record_game_finished()
{
	var timestr = new Date().toISOString();
	localStorage.setItem(PACKAGE + '.game.' + G.shuffle_id + '.finished', timestr);
}

function admit_defeat_clicked()
{
	record_game_finished();
	return set_move('give_up');
}

function declare_victory_clicked()
{
	record_game_finished();
	return set_move('claim_victory');
}

function discover_cure_clicked()
{
	var u = BASE_URL + '#' + G.game_id + '/T' + G.time + '/discover_cure';
	history.pushState(null, null, u);
	on_state_init();
	return false;
}

function cancel_show_discards()
{
	history.back();
}

function get_current_game_url()
{
	if (G.has_control) {
		return BASE_URL + '#' + G.game_id + '/T' + G.time;
	}
	else {
		return BASE_URL + '#' + G.game_id + '/watch';
	}
}

function show_discards_clicked()
{
	var u = get_current_game_url() + '/discards';
	history.pushState(null, null, u);
	on_state_init();
	return false;
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
}

function on_discover_cure_clicked(disease_color)
{
	return set_move('discover '+disease_color);
}

function do_discover_cure(disease_color)
{
	G.diseases[disease_color] = 'cured';
	G.history.push({
		'type':'discover_cure',
		'player': G.active_player,
		'disease':disease_color
		});

	if (count_uncured_diseases(G) == 0) {
		G.step = 'end';
		G.result = 'victory';
	}
	G.time++;
}

function count_uncured_diseases(G)
{
	var count = 0;
	for (var disease_color in Pandemic.Diseases) {
		if (!G.diseases[disease_color]) {
			count++;
		}
	}
	return count;
}

function init_discover_cure_page($pg)
{
	$('.discover_cure_btn', $pg).each(function(idx,el) {
		var disease_color = el.getAttribute('data-disease');
		if (G.diseases[disease_color]) {
			$(el).hide();
		}
		else {
			$(el).show();
		}
		});
}

function init_play_special_event_page($pg)
{
	$('.special_action_name').text("Play");
	$('.special_event_btn_row:not(.template)').remove();
	for (var i = 0; i < Pandemic.Specials.length; i++) {
		var s = Pandemic.Specials[i];
		if (!has_special_event(s)) {
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

function play_special_event_clicked()
{
	var u = BASE_URL + '#' + G.game_id + '/T' + G.time + '/play_special';
	history.pushState(null, null, u);
	on_state_init();
	return false;
}

function init_retrieve_special_event_page($pg)
{
	$('.special_action_name').text("Retrieve");
	$('.special_event_btn_row:not(.template)').remove();
	for (var i = 0; i < Pandemic.Specials.length; i++) {
		var s = Pandemic.Specials[i];
		if (!discarded_special_event(s)) {
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

function retrieve_special_event_clicked()
{
	var u = BASE_URL + '#' + G.game_id + '/T' + G.time + '/retrieve_special';
	history.pushState(null, null, u);
	on_state_init();
	return false;
}

function cancel_special_event()
{
	history.back();
}

function init_found_completed_games_page($pg, search_results)
{
	$('.results_game_row:not(.template)', $pg).remove();

	var lis = search_results.results;
	for (var i = 0; i < lis.length; i++) {
		var result_id = lis[i].id;
		var r = load_result(result_id);
		if (!r || r.version != Version) { continue; }

		var shuffle_id = r.shuffle_id;
		load_scenario(shuffle_id);

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

		$('.scenario_name_container', $g).append(make_scenario_label(shuffle_id));
		$('.epidemic_count', $g).text(G.rules.level);
		$('.epidemic_level_caption', $g).text(
			G.rules.level == 4 ? 'Intro' :
			G.rules.level == 5 ? 'Normal' :
			G.rules.level == 6 ? 'Heroic' :
			G.rules.level == 7 ? 'Legendary' : ''
			);
		$('.location', $g).text(r.location);
		$('.submitted', $g).text(format_time(r.time));

		$('button', $g).attr('data-scenario-id', shuffle_id);
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
		if (!r || r.version != Version) { continue; }

		var shuffle_id = r.shuffle_id;
		load_scenario(shuffle_id);

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

		$('.scenario_name_container', $g).append(make_scenario_label(shuffle_id));
		$('.epidemic_count', $g).text(G.rules.level);
		$('.epidemic_level_caption', $g).text(
			G.rules.level == 4 ? 'Intro' :
			G.rules.level == 5 ? 'Normal' :
			G.rules.level == 6 ? 'Heroic' :
			G.rules.level == 7 ? 'Legendary' : ''
			);
		$('.location', $g).text(r.location);
		$('.submitted', $g).text(format_time(r.time));

		$('button', $g).attr('data-scenario-id', shuffle_id);
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

	var u = BASE_URL + '#'+scenario_id+'/results';
	history.pushState(null, null, u);
	on_state_init();
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
	for (var i = 0; i < a.length; i++) {

		var $tr = $('.scenario_row.template').clone();
		$tr.removeClass('template');
		$('.scenario_name_container',$tr).append(make_scenario_label(a[i]));
		$('button',$tr).attr('data-shuffle-id', a[i]);
		$('button',$tr).click(on_preshuffled_game_clicked);

		var $g = $tr;
		G = load_scenario(a[i]);
		$('.epidemic_count', $g).text(G.rules.level);
		$('.epidemic_level_caption', $g).text(
			G.rules.level == 4 ? 'Intro' :
			G.rules.level == 5 ? 'Normal' :
			G.rules.level == 6 ? 'Heroic' :
			G.rules.level == 7 ? 'Legendary' : ''
			);

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
			deal_finished(a[i]) ? ('; Completed ' + format_time(deal_finish_time(a[i]))) :
			deal_started(a[i]) ? ('; Started ' + format_time(deal_first_played_time(a[i]))) :
			'';
		if (results_info.maximum_score > 0 && deal_finished(a[i])) {
			description += '; best score: '+results_info.maximum_score;
		}

		$('.deal_status_col', $tr).text(description);

		$('.scenarios_list', $pg).append($tr);
	}
}

function on_state_init()
{
	var path = location.hash;
	if (path && path.substring(0,1) == '#') {
		path = path.substring(1);
	}

	var m;
	if (!path) {
		var $pg = show_page('welcome_page');
		init_welcome_page($pg);
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
		var $pg = show_page('subscription_page');
		init_subscription_page($pg);
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
	else if (m = path.match(/^watch\/(.*)$/)) { //old-style watch url
		var game_id = unescape(m[1]);
		show_blank_page();
		do_watch_game(game_id, null);
	}
	else if (m = path.match(/^([0-9a-f]+)\/watch(\/.*)?$/)) { //new-style watch url
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

$(function() {
	window.addEventListener('popstate', on_state_init);
	on_state_init();
});

$(function() {
	$('.cure_count').change(update_game_score);
});

function go_home_page()
{
	localStorage.removeItem(PACKAGE + '.current_game');
	localStorage.removeItem(PACKAGE + '.current_game.scenario');

	history.pushState(null, null, BASE_URL);
	on_state_init();
}

function start_game_clicked()
{
	history.pushState(null, null, BASE_URL + '#params');
	on_state_init();
}

function resume_game_clicked()
{
	var game_id = localStorage.getItem(PACKAGE + '.current_game');
	if (game_id == null) {
		return false;
	}

	var time_str = localStorage.getItem(PACKAGE + '.game.' + game_id + '.time');
	if (time_str != null) {
		var u = BASE_URL + '#' + game_id + '/T' + time_str;
		history.pushState(null, null, u);
		on_state_init();
	}
	else {
		var u = BASE_URL + '#' + game_id + '/player_setup';
		history.pushState(null, null, u);
		on_state_init();
	}

	return;
}

function review_results_clicked()
{
	history.pushState(null, null, BASE_URL + '#review_results');
	on_state_init();
}

function join_network_game_clicked()
{
	history.pushState(null, null, BASE_URL + '#join_network_game');
	on_state_init();
}

function options_clicked()
{
	history.pushState(null, null, BASE_URL + '#options');
	on_state_init();
}

function go_subscription_page()
{
	history.pushState(null, null, BASE_URL + '#subscription');
	on_state_init();
}

function summarize_results_for_scenario(shuffle_id)
{
	var names = {};
	var best_score = 0;

	var a = stor_get_list(PACKAGE + '.game_results.' + shuffle_id);
	for (var i = 0; i < a.length; i++) {

		var V = load_result(a[i]);
		for (var pid = 1; pid < 5; pid++) {
			var nam = V['player'+pid];
			if (nam) {
				names[nam] = true;
			}
		}

		if (V.score > best_score) {
			best_score = V.score;
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

	var V = JSON.parse(VV);
	return V;
}

function save_current_result(for_submission)
{
	var f = document.game_completed_form;

	localStorage.setItem(PACKAGE + '.game_location', f.location.value);

	var V = {};
	V.version = Version;
	V.rules = f.rules.value;
	V.shuffle_id = f.shuffle_id.value;
	V.scenario_id = f.shuffle_id.value;
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
	localStorage.setItem(PACKAGE + '.my_result.' + G.shuffle_id, result_id);

	return result_id;
}

function submit_result_clicked()
{
	var result_id = save_current_result(true);

	stor_add_to_set(PACKAGE + '.game_results.' + G.shuffle_id, result_id);
	stor_add_to_set(PACKAGE + '.pending_results', result_id);
	stor_add_to_set(PACKAGE + '.my_results', result_id);
	stor_add_to_set(PACKAGE + '.my_games', G.shuffle_id);

	trigger_sync_process();

	var u = BASE_URL + '#'+G.shuffle_id+'/results';
	history.pushState(null, null, u);
	on_state_init();
	return false;
}

function dont_submit_clicked()
{
	var result_id = save_current_result(false);

	// this makes this game show up in the "Review Results" page
	stor_add_to_set(PACKAGE + '.my_results', result_id);
	stor_add_to_set(PACKAGE + '.my_games', G.shuffle_id);

	var u = BASE_URL + '#'+G.shuffle_id+'/results';
	history.pushState(null, null, u);
	on_state_init();
	return false;
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
	if (!sync_started) {
		continue_sync();
	}
}

function continue_sync()
{
	sync_started = true;

	// check for pending scenarios
	var a = stor_get_list(PACKAGE + '.pending_scenarios');
	if (a.length) {
		var shuffle_id = a[0];
		return upload_scenario(shuffle_id);
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
		console.log("sync: checking for items to download");
		check_for_downloads();
	}

	// nothing more to do
	console.log("sync: finished");
	sync_started = false;
}

function upload_scenario(shuffle_id)
{
	console.log("sync: uploading scenario "+shuffle_id);
	var s = localStorage.getItem(PACKAGE + '.scenario.' + shuffle_id);

	var onSuccess = function(data) {
		console.log('sync: successful upload of '+shuffle_id);
		stor_remove_from_set(PACKAGE + '.pending_scenarios', shuffle_id);
		return continue_sync();
		};

	$.ajax({
	type: "POST",
	url: "s/deals?id="+shuffle_id,
	data: s,
	contentType: "application/json; charset=utf-8",
	dataType: "json",
	success: onSuccess,
	error: handle_ajax_error
	});
}

function upload_result(result_id)
{
	console.log("sync: uploading result "+result_id);
	var s = localStorage.getItem(PACKAGE + '.result.' + result_id);

	var onSuccess = function(data) {
		console.log('sync: successful upload of '+result_id);
		stor_remove_from_set(PACKAGE + '.pending_results', result_id);
		return continue_sync();
		};

	$.ajax({
	type: "POST",
	url: "s/deals?result="+result_id,
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

	var shuffle_id = localStorage.getItem(PACKAGE + '.current_game.scenario');
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
			'scenario': shuffle_id,
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
			console.log('sync: successful upload of current game metadata');
			console.log('sync: new game id is '+game_id);
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
}

function upload_current_game_moves(game_id, secret)
{
	console.log("sync: uploading current game movelog");
	delete pending_sync.game_state;

	var mv_array = [];
	for (var t = 0; t < G.time; t++) {
		var mv = get_move(G.shuffle_id, t);
		mv_array.push(mv);
	}

	var X = {
		'secret': secret,
		'time': G.time,
		'moves': mv_array
		};

	var onSuccess = function(data) {
		console.log('sync: successful upload of current game movelog');
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
			on_state_init();
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

function has_scenario(deal_id)
{
	return localStorage.getItem(PACKAGE + '.scenario.' + deal_id) != null;
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
	var deal_id = result_data.shuffle_id;
	if (!deal_id) {
		console.log("Warning: deal number not found in result "+result_id);
		return;
	}

	console.log('result is for deal '+deal_id);

	var VV = JSON.stringify(result_data);
	localStorage.setItem(PACKAGE + '.result.' + result_id, VV);
	stor_add_to_set(PACKAGE + '.game_results.' + deal_id, result_id);
}

function download_result(result_b)
{
	var onSuccess = function(data) {
		console.log('sync: successful download of result '+result_b.id);
		save_downloaded_result(result_b.id, data);
		return download_next_result();
		};

	console.log('sync: downloading result '+result_b.id);
	$.ajax({
	type: "GET",
	url: "s/deals?deal="+escape(result_b.scenario)+"&result="+escape(result_b.id),
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
		console.log('sync: successful download of '+scenario_id);
		save_downloaded_scenario(scenario_id, data);
		return download_next_scenario();
		};

	console.log('sync: downloading scenario '+scenario_id);
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

function onRenamePlayerClicked()
{
	var p_name = G.player_names[G.active_player];
	var p_role = G.roles[G.active_player];
	p_name = window.prompt('Enter name of '+p_role, p_name);
	if (p_name) {
		G.player_names[G.active_player] = p_name;
		save_player_names();
		$('.page_header .player_name').text(p_name);
		on_state_init();
	}
}

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
	$('.page_header .role_icon').click(onRenamePlayerClicked);
	window.onresize = check_screen_size;
});

function login_clicked()
{
	if (S.loginUrl) {
		location.href = S.loginUrl;
	}
	else {
		console.log("no login url");
		console.log(JSON.stringify(S));
	}
}

function logout_clicked()
{
	if (S.logoutUrl) {
		location.href = S.logoutUrl;
	}
}
