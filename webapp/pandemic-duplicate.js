var PACKAGE = 'pandemic-duplicate';
var BASE_URL = location.href;
if (BASE_URL.indexOf('#') != -1) {
	BASE_URL = BASE_URL.substring(0, BASE_URL.indexOf('#'));
}

var Version = 1;
var Roles = [
	// original roles
	'Dispatcher',
	'Operations Expert',
	'Scientist',
	'Medic',
	'Researcher',

	// expansion roles (those supported, anyway)
	'Field Operative',
	'Containment Specialist',
	'Generalist',
	'Archivist',
	'Epidemiologist',
	'Troubleshooter'
	];
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
	'Troubleshooter': 'troubleshooter_role_icon.png'
	};

var Cities = [
	// Blue cities
	'Atlanta',
	'New York',
	'Chicago',
	'Toronto',
	'San Francisco',
	'Washington',
	'London',
	'Madrid',
	'Paris',
	'Essen',
	'Milan',
	'St. Petersburg',

	// Yellow cities
	'Los Angeles',
	'Mexico City',
	'Miami',
	'Bogota',
	'Lima',
	'Santiago',
	'Sao Paulo',
	'Buenos Aires',
	'Lagos',
	'Johannesburg',
	'Kinshasa',
	'Khartoum',

	//Black cities
	'Delhi',
	'Karachi',
	'Tehran',
	'Mumbai',
	'Riyadh',
	'Cairo',
	'Algiers',
	'Baghdad',
	'Chennai',
	'Moscow',
	'Istanbul',
	'Kolkata',

	//Red cities
	'Hong Kong',
	'Bangkok',
	'Shanghai',
	'Beijing',
	'Seoul',
	'Tokyo',
	'Osaka',
	'Taipei',
	'Jakarta',
	'Ho Chi Minh City',
	'Manila',
	'Sydney'

	];
var Translated_City_Names = {
	'Bogota': 'Bogotá',
	'Sao Paulo': 'São Paulo'
	};

var Specials = [
	// specials from the base game
	'Airlift',
	'Forecast',
	'Government Grant',
	'One Quiet Night',
	'Resilient Population',

	// specials from the "On the Brink" expansion
	'Borrowed Time',
	'Commercial Travel Ban',
	'Mobile Hospital',
	'New Assignment',
	'Rapid Vaccine Deployment',
	'Re-examined Research',
	'Remote Treatment',
	'Special Orders'
	];
var G = null;

var City_Info = {};
for (var i = 0; i < Cities.length; i++) {
	var ci = {
		'id': Cities[i],
		'name': Translated_City_Names[Cities[i]] || Cities[i],
		'color': (i < 12 ? 'blue' : i < 24 ? 'yellow' : i < 36 ? 'black' : 'red')
		};
	City_Info[ci.id] = ci;
}

function shuffle_array(A)
{
	for (var i = 0; i < A.length; i++) {
		var j = i + Math.floor(Math.random() * (A.length-i));
		var tmp = A[i];
		A[i] = A[j];
		A[j] = tmp;
	}
}

function generate_decks()
{
	var num_specials = G.rules.expansion == 'none' ? 5 : Specials.length;
	var num_roles = G.rules.expansion == 'none' ? 5 : Roles.length;

	var S = [];
	for (var i = 0; i < num_specials; i++) {
		S.push(Specials[i]);
	}
	shuffle_array(S);

	var A = [];
	for (var i = 0; i < Cities.length; i++) {
		A.push(Cities[i]);
	}

	var num_specials_avail = G.rules.expansion == 'none' ? 5 : G.rules.player_count*2;
	for (var i = 0; i < S.length && i < num_specials_avail; i++) {
		A.push(S[i]);
	}

	var R = [];
	for (var i = 0; i < num_roles; i++) {
		R.push(Roles[i]);
	}
	shuffle_array(R);

	shuffle_array(A);
	var hand_size = G.rules.player_count <= 2 ? 4 :
		G.rules.player_count == 3 ? 3 : 2;

	G.initial_hands = {};
	G.roles = {};
	for (var i = 0; i < G.rules.player_count; i++) {
		var b = [];
		for (var j = 0; j < hand_size; j++) {
			var c = A.pop();
			b.push(c);
		}
		G.initial_hands[(1+i)] = b;
		G.roles[(1+i)] = R.pop();
	}

	var piles = [];
	for (var i = 0; i < G.rules.level; i++) {
		piles.push(['Epidemic']);
	}
	for (var i = 0; i < A.length; i++) {
		var j = i % piles.length;
		piles[j].push(A[i]);
	}
	G.player_deck = [];
	for (var i = piles.length-1; i >= 0; i--) {
		shuffle_array(piles[i]);
		for (var j = 0; j < piles[i].length; j++) {
			G.player_deck.push(piles[i][j]);
		}
	}

	G.infection_deck = [];
	for (var i = 0; i < Cities.length; i++) {
		G.infection_deck.push(Cities[i]);
	}
	shuffle_array(G.infection_deck);

	for (var k = 1; k <= G.rules.level; k++) {
		var a = [];
		for (var i = 0; i < Cities.length; i++) {
			a.push(Cities[i]);
		}
		shuffle_array(a);
		G['epidemic.'+k] = a;
	}

	var X = {
	'initial_hands': G.initial_hands,
	'roles': G.roles,
	'player_deck': G.player_deck,
	'infection_deck': G.infection_deck,
	'rules': G.rules
	};
	for (var k = 1; k <= G.rules.level; k++) {
		X['epidemic.'+k] = G['epidemic.'+k];
	}

	var XX = JSON.stringify(X);
	G.shuffle_id = (""+CryptoJS.SHA1(XX)).substring(0,18);

	localStorage.setItem(PACKAGE + '.shuffle.' + G.shuffle_id, XX);
	stor_add_to_set(PACKAGE + '.deals_by_rules.' + stringify_rules(G.rules), G.shuffle_id);
	stor_add_to_set(PACKAGE + '.pending_deals', G.shuffle_id);

	trigger_sync_process();

	return G.shuffle_id;
}

function load_game(game_id)
{
	load_shuffle(game_id);

	var s = localStorage.getItem(PACKAGE + '.player_names');
	if (s) {
		G.player_names = JSON.parse(s);
	}

	G.active_player = 1;
	G.history = [];
	G.history.push({'type':'next_turn', 'active_player':1});
	G.time = 0;
	G.turns = 1;
	G.step = 'actions';
	G.hands = {};
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

	G.epidemic_count = 0;

	G.player_discards = [];
	G.game_length_in_turns = 1+Math.floor(G.player_deck.length/2);
	return G;
}

function load_shuffle(shuffle_id)
{
	var s = localStorage.getItem(PACKAGE + '.shuffle.' + shuffle_id);
	if (!s) {
		console.log('Fatal: shuffle '+shuffle_id+' is not known');
		return;
	}

	G = JSON.parse(s);
	G.shuffle_id = shuffle_id;
	return G;
}

function stringify_rules(R)
{
	return R.expansion+'-'+R.player_count+'p-'+R.level+'x';
}

function parse_rules(s)
{
	var ss = s.split(/-/);
	return {
	'expansion': ss[0],
	'player_count': +ss[1].substring(0, ss[1].length-1),
	'level': +ss[2].substring(0, ss[2].length-1),
	};
}

function submit_create_game_form()
{
	var f = document.create_game_form;
	var rules = {
		'player_count': +f.player_count.value,
		'expansion': f.expansion.value,
		'level': +f.level.value
		};
	var rules_key = stringify_rules(rules);

	//history.pushState(null, null, BASE_URL + '#pick_game/' + rules_key);
	//on_state_init();
	//return false;
	var u = BASE_URL + '#names/' + rules_key;
	history.pushState(null, null, u);
	on_state_init();
	return false;
}

function generate_new_game_clicked()
{
	G = {};
	G.rules = parse_rules(document.pick_game_form.rules.value);
	var shuffle_id = generate_decks();

	var u = BASE_URL + '#'+shuffle_id+'/player_setup';
	history.pushState(null, null, u);
	on_state_init();
}

function init_player_names_page($pg, rulestr)
{
	G = {};
	G.rules = parse_rules(rulestr);
	var s = localStorage.getItem(PACKAGE + '.player_names');
	if (s) {
		G.player_names = JSON.parse(s);
	}
	else {
		G.player_names = {};
	}

	var f = document.player_names_form;
	f.rules.value = rulestr;
	f.player1.value = G.player_names[1] || 'Player 1';
	f.player2.value = G.player_names[2] || 'Player 2';
	f.player3.value = G.player_names[3] || 'Player 3';
	f.player4.value = G.player_names[4] || 'Player 4';
	
	if (G.rules.player_count <= 2) {
		$('.player3', $pg).hide();
		$('.player4', $pg).hide();
	}
	else if (G.rules.player_count == 3) {
		$('.player3', $pg).show();
		$('.player4', $pg).hide();
	}
	else {
		$('.player3', $pg).show();
		$('.player4', $pg).show();
	}
}

function update_game_score()
{
	// cure count only used on loss
	var num_cures = +document.game_completed_form.cure_count.value;
	var num_turns = +G.turns;

	var score;
	if (G.result == 'victory') {
		score = 100+Math.floor(G.player_deck.length/2);
	}
	else {
		score = num_cures*12+num_turns;
	}
	document.game_completed_form.score.value = score;
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
	}
	else if (G.rules.player_count == 3) {
		$('.player3', $pg).show();
		$('.player4', $pg).hide();
	}
	else {
		$('.player3', $pg).show();
		$('.player4', $pg).show();
	}

	for (var i = 1; i <= G.rules.player_count; i++) {
		$('.player'+i+' input', $pg).attr('value', G.player_names[i]);
		$('.player'+i+' .role_icon', $pg).attr('src', 'images/'+Role_icons[G.roles[i]]);
		$('.player'+i+' .role', $pg).text(G.roles[i]);
	}
	document.game_completed_form.rules.value = stringify_rules(G.rules);
	document.game_completed_form.shuffle_id.value = G.shuffle_id;
}

function submit_player_names_form()
{
	var f = document.player_names_form;
	var rules_key = f.rules.value;
	G = {};
	G.rules = parse_rules(rules_key);
	G.player_names = {
		'1': f.player1.value,
		'2': f.player2.value,
		'3': f.player3.value,
		'4': f.player4.value
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
		for (var i = 0; i < 4; i++) {
			p[1+i] = i < G.rules.player_count ?
				G.player_names[1+(i+t)%G.rules.player_count] :
				G.player_names[1+i];
		}
		G.player_names = p;
	}

	save_player_names();

	history.pushState(null, null, BASE_URL + '#pick_game/' + rules_key);
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
	load_shuffle(shuffle_id);

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

function init_board_setup_page($pg, shuffle_id)
{
	load_game(shuffle_id);

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

function init_player_setup_page($pg, shuffle_id)
{
	load_game(shuffle_id);

	$('.deal_name',$pg).text(shuffle_name(shuffle_id));

	if (G.rules.player_count <= 2) {
		$('.player3', $pg).hide();
		$('.player4', $pg).hide();
	}
	else if (G.rules.player_count == 3) {
		$('.player3', $pg).show();
		$('.player4', $pg).hide();
	}
	else {
		$('.player3', $pg).show();
		$('.player4', $pg).show();
	}

	for (var i = 1; i <= G.rules.player_count; i++) {
		if (G.player_names) {
			$('.player'+i+' .player_name', $pg).text(G.player_names[i]);
		}
		$('.player'+i+' .role', $pg).text(G.roles[i]);
		$('.player'+i+' .role_icon', $pg).attr('src', 'images/'+Role_icons[G.roles[i]]);
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
		var r_text = localStorage.getItem(PACKAGE + '.result.' + result_id);
		var r = JSON.parse(r_text);
		if (r.version != Version) { continue; }
		if (r.shuffle_id != shuffle_id) { continue; }

		if (all_result_ids[i] == my_result_id) {
			r.mine = true;
		}
		all_results.push(r);
	}

	all_results.sort(function(a,b) {
		return a.score < b.score ? 1 :
			a.score > b.score ? -1 :
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
		var players_str = '';
		for (var j = 1; j <= rules.player_count; j++) {
			players_str += (j > 1 ? ', ' : '') +
				r['player'+j];
		}

		var is_a_tie = (i > 0 && all_results[i-1].score == r.score) ||
			(i+1 < all_results.length && all_results[i+1].score == r.score);
		place = (i > 0 && all_results[i-1].score == r.score) ? place : i+1;

		$('.place_col', $tr).text((is_a_tie ? 'T' : '') + place);
		$('.score_col', $tr).text(r.score);
		$('.players_col', $tr).text(players_str);
		$('.submitted_col', $tr).text(r.time);

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
	var ci = City_Info[c];

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
	var ci = City_Info[c];

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
	var u = BASE_URL + '#'+G.shuffle_id+'/board_setup';
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

		var m = localStorage.getItem(PACKAGE + '.game.' + G.shuffle_id + '.T' + G.time);
		if (m == null) { m = 'pass'; }

		do_move(m);
	}
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

function debug_infection_discards()
{
	var s = '';
	for (var i = 0; i < G.infection_discards.length; i++) {
		s += G.infection_discards[i] + ',';
	}
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
		var pid = find_and_remove_card_any_hand(cc);
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
		}
	}
	else {
		hfun(c);
	}

	G.time++;
}

function set_game_state_summary($pg)
{
	var r = G.roles[G.active_player];
	$('.page_header .role_icon', $pg).
		attr('alt', r).
		attr('src', 'images/'+Role_icons[r]);
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

	set_continue_btn_caption($pg);
}

function set_continue_btn_caption($pg)
{
	if (G.step == 'actions' && G.turns >= G.game_length_in_turns) {
		$('.defeat_button_container', $pg).show();
		$('.continue_button_container', $pg).hide();
		return;
	}
	else {
		$('.defeat_button_container', $pg).hide();
		$('.continue_button_container', $pg).show();
	}

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

	set_continue_btn_caption($pg);
}

function show_page(page_name)
{
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

function shuffle_name(shuffle_id)
{
	var A = parseInt(shuffle_id.substring(0,6), 16);
	var i = Math.floor(A * WORDS.length / 0x1000000);

	var B = parseInt(shuffle_id.substring(6,12), 16);
	var j = Math.floor(B * WORDS.length / 0x1000000);

	var C = parseInt(shuffle_id.substring(12,18), 16);
	var k = Math.floor(C * WORDS.length / 0x1000000);

	return WORDS[i]+' '+WORDS[j]+' '+WORDS[k];
}

function on_preshuffled_game_clicked(evt)
{
	var el = this;
	var shuffle_id = el.getAttribute('data-shuffle-id');

	var u = BASE_URL + '#'+shuffle_id+'/player_setup';
	history.pushState(null, null, u);
	on_state_init();
}

function navigate_to_current_turn()
{
	var u = BASE_URL + '#' + G.shuffle_id + '/T' + G.time;
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
	return timestr;
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

		var a_ci = City_Info[a];
		var b_ci = City_Info[b];
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
	for (var i = 0; i < Roles.length; i++) {
		if (role_in_use(Roles[i])) { continue; }
		var $o = $('<option></option>');
		$o.attr('value', Roles[i]);
		$o.text(Roles[i]);
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

function has_special_event(s)
{
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

function cancel_show_discards()
{
	on_state_init();
}

function show_discards_clicked()
{
	var $pg = show_page('show_discards_page');
	$('.infection_discards_list', $pg).empty();

	for (var i = 0; i < G.infection_discards.length; i++) {
		var c = G.infection_discards[i];

		$('.infection_discards_list', $pg).append(
			make_infection_card_li(c)
			);
	}
}

function play_special_event_clicked()
{
	var $pg = show_page('special_event_page');

	$('.special_event_btn_row:not(.template)').remove();
	for (var i = 0; i < Specials.length; i++) {
		var s = Specials[i];
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

function cancel_special_event()
{
	on_state_init();
}

function init_pick_game_page($pg, rulestr)
{
	document.pick_game_form.rules.value = rulestr;

	$('.preshuffle_row:not(.template)').remove();
	var a = stor_get_list(PACKAGE + '.deals_by_rules.' + rulestr);
	for (var i = 0; i < a.length; i++) {

		var $tr = $('.preshuffle_row.template').clone();
		$tr.removeClass('template');
		$('button',$tr).text(shuffle_name(a[i]));
		$('button',$tr).attr('data-shuffle-id', a[i]);
		$('button',$tr).click(on_preshuffled_game_clicked);

		var results_info = summarize_results_for_deal(a[i]);
		var played_by = results_info.played_by;
		var description = 
			deal_finished(a[i]) ? ('Completed ' + format_time(deal_finish_time(a[i]))) :
			deal_started(a[i]) ? ('Started ' + format_time(deal_first_played_time(a[i]))) :
			'';
		if (played_by.length) {
			description += '; played by';
			for (var j = 0; j < played_by.length; j++) {
				description += ' ' + played_by[j];
			}
		}
		if (results_info.maximum_score > 0 && deal_finished(a[i])) {
			description += '; best score: '+results_info.maximum_score;
		}

		$('.deal_status_col', $tr).text(description);

		$('.preshuffle_table', $pg).append($tr);
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
	else if (m = path.match(/^names\/(.*)$/)) {
		var $pg = show_page('player_names_page');
		init_player_names_page($pg, m[1]);
	}
	else if (m = path.match(/^pick_game\/(.*)$/)) {
		var $pg = show_page('pick_game_page');
		init_pick_game_page($pg, m[1]);
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
	else if (m = path.match(/^([0-9a-f]+)\/results$/)) {
		var $pg = show_page('results_page');
		init_results_page($pg, m[1]);
	}
	else if (m = path.match(/^([0-9a-f]+)\/T([\d-]+)/)) {
		load_game_at(m[1], m[2]);
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
	history.pushState(null, null, BASE_URL);
	on_state_init();
}

function start_game_clicked()
{
	history.pushState(null, null, BASE_URL + '#params');
	on_state_init();
}

function dont_submit_clicked()
{
	localStorage.removeItem(PACKAGE + '.my_result.' + G.shuffle_id);

	var u = BASE_URL + '#'+G.shuffle_id+'/results';
	history.pushState(null, null, u);
	on_state_init();
	return false;
}

function summarize_results_for_deal(shuffle_id)
{
	var names = {};
	var best_score = 0;

	var a = stor_get_list(PACKAGE + '.game_results.' + shuffle_id);
	for (var i = 0; i < a.length; i++) {

		var V = load_result(a[i]);
		for (var i = 1; i < 5; i++) {
			var nam = V['player'+i];
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

	return {
		'played_by': names_list,
		'maximum_score': best_score
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

function submit_result_clicked()
{
	var f = document.game_completed_form;

	var V = {};
	V.version = Version;
	V.rules = f.rules.value;
	V.shuffle_id = f.shuffle_id.value;
	V.score = f.score.value;
	for (var i = 1; i <= G.rules.player_count; i++) {
		V['player'+i] = f['player'+i].value;
	}
	V.time = new Date().toISOString();

	var VV = JSON.stringify(V);
	var result_id = (""+CryptoJS.SHA1(VV)).substring(0,18);
	localStorage.setItem(PACKAGE + '.result.' + result_id, VV);
	localStorage.setItem(PACKAGE + '.my_result.' + G.shuffle_id, result_id);
	stor_add_to_set(PACKAGE + '.game_results.' + G.shuffle_id, result_id);
	stor_add_to_set(PACKAGE + '.pending_results', result_id);

	trigger_sync_process();

	var u = BASE_URL + '#'+G.shuffle_id+'/results';
	history.pushState(null, null, u);
	on_state_init();
	return false;
}

var sync_started = false;
function trigger_sync_process()
{
	if (sync_started) { return; }
	sync_started = true;

	console.log("sync: checking for items to upload");
	upload_next_deal();
}

function upload_next_result()
{
	var a = stor_get_list(PACKAGE + '.pending_results');
	if (a.length) {
		var result_id = a[0];
		upload_result(result_id);
	}
	else {
		console.log("sync: checking for items to download");
		check_for_downloads();
	}
}

function upload_next_deal()
{
	var a = stor_get_list(PACKAGE + '.pending_deals');
	if (a.length) {
		var shuffle_id = a[0];
		upload_deal(shuffle_id);
	}
	else {
		upload_next_result();
	}
}

function upload_result(result_id)
{
	console.log("sync: uploading result "+result_id);
	var s = localStorage.getItem(PACKAGE + '.result.' + result_id);

	var onSuccess = function(data) {
		console.log('sync: successful upload of '+result_id);
		stor_remove_from_set(PACKAGE + '.pending_results', result_id);
		return upload_next_result();
		};
	var onError = function(jqx, status, errMsg) {
		console.log('an error occurred');
		};

	$.ajax({
	type: "POST",
	url: "s/deals?result="+result_id,
	data: s,
	contentType: "application/json; charset=utf-8",
	dataType: "json",
	success: onSuccess,
	error: onError
	});
}

function upload_deal(shuffle_id)
{
	console.log("sync: uploading deal "+shuffle_id);
	var s = localStorage.getItem(PACKAGE + '.shuffle.' + shuffle_id);

	var onSuccess = function(data) {
		console.log('sync: successful upload of '+shuffle_id);
		stor_remove_from_set(PACKAGE + '.pending_deals', shuffle_id);
		return upload_next_deal();
		};
	var onError = function(jqx, status, errMsg) {
		console.log('an error occurred');
		};

	$.ajax({
	type: "POST",
	url: "s/deals?id="+shuffle_id,
	data: s,
	contentType: "application/json; charset=utf-8",
	dataType: "json",
	success: onSuccess,
	error: onError
	});
}
$(trigger_sync_process);

var pending_download_deals=[];
var pending_download_results=[];

function check_for_downloads()
{
	var onSuccess = function(data) {
		for (var i = 0; i < data.deals.length; i++) {
			var d = data.deals[i];
			if (!has_deal(d.id)) {
				pending_download_deals.push(d.id);
			}
		}
		for (var i = 0; i < data.results.length; i++) {
			var d = data.results[i];
			if (!has_result(d.id)) {
				pending_download_results.push(d);
			}
		}
		return download_next_deal();
		};
	var onError = function(jqx, status, errMsg) {
		console.log('an error occurred');
		};

	$.ajax({
	type: "GET",
	url: "s/deals",
	dataType: "json",
	success: onSuccess,
	error: onError
	});
}

function has_deal(deal_id)
{
	return localStorage.getItem(PACKAGE + '.shuffle.' + deal_id) != null;
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
		console.log("sync: finished");
		sync_started = false;
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
	var onError = function(jqx, status, errMsg) {
		console.log('an error occurred');
		};

	console.log('sync: downloading result '+result_b.id);
	$.ajax({
	type: "GET",
	url: "s/deals?deal="+escape(result_b.deal)+"&result="+escape(result_b.id),
	dataType: "json",
	success: onSuccess,
	error: onError
	});
}

function download_next_deal()
{
	if (pending_download_deals.length) {
		var deal_id = pending_download_deals.shift();
		return download_deal(deal_id);
	}
	else {
		return download_next_result();
	}
}

function save_downloaded_deal(deal_id, data)
{
	var XX = JSON.stringify(data);
	localStorage.setItem(PACKAGE + '.shuffle.' + deal_id, XX);
	stor_add_to_set(PACKAGE + '.deals_by_rules.' + stringify_rules(data.rules), deal_id);
}

function download_deal(deal_id)
{
	var onSuccess = function(data) {
		console.log('sync: successful download of '+deal_id);
		save_downloaded_deal(deal_id, data);
		return download_next_deal();
		};
	var onError = function(jqx, status, errMsg) {
		console.log('an error occurred');
		};

	console.log('sync: downloading deal '+deal_id);
	$.ajax({
	type: "GET",
	url: "s/deals?deal="+escape(deal_id),
	dataType: "json",
	success: onSuccess,
	error: onError
	});
}

function onRenamePlayerClicked()
{
	var p_name = G.player_names[G.active_player];
	var p_role = G.roles[G.active_player];
	p_name = window.prompt('Enter name of '+p_role, p_name);
	G.player_names[G.active_player] = p_name;
	save_player_names();
	$('.page_header .player_name').text(p_name);
}

function check_screen_size()
{
	var hh = window.innerHeight -
		$('.end_of_page').offset().top +
		$('.history_container').height() -
		16;
	$('.history_container').css({
		'min-height': hh+'px'
		});
}

$(function() {
	$('.page_header .role_icon').click(onRenamePlayerClicked);
	window.onresize = check_screen_size;
});
