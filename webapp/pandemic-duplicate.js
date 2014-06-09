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
	'Epidemiologist'

	];
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
	'Airlift',
	'Borrowed Time',
	'Commercial Travel Ban',
	'Forecast',
	'Government Grant',
	'Mobile Hospital',
	'New Assignment',
	'One Quiet Night',
	'Rapid Vaccine Deployment',
	'Re-examined Research',
	'Remote Treatment',
	'Resilient Population',
	'Special Orders',
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
	var S = [];
	for (var i = 0; i < Specials.length; i++) {
		S.push(Specials[i]);
	}
	shuffle_array(S);

	var A = [];
	for (var i = 0; i < Cities.length; i++) {
		A.push(Cities[i]);
	}
	for (var i = 0; i < S.length && i < G.rules.player_count*2; i++) {
		A.push(S[i]);
	}

	var R = [];
	for (var i = 0; i < Roles.length; i++) {
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
		var j = Math.floor(Math.random()*piles.length);
		piles[j].push(A[i]);
	}
	G.player_deck = [];
	for (var i = 0; i < piles.length; i++) {
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
	G.shuffle_name = (""+CryptoJS.SHA1(XX)).substring(0,18);

	localStorage.setItem(PACKAGE + '.shuffle.' + G.shuffle_name, XX);
	localStorage.setItem(PACKAGE + '.shuffle_version.' + G.shuffle_name, Version);
	stor_add_to_set(PACKAGE + '.deals_by_rules.' + stringify_rules(G.rules), G.shuffle_name);

	return G.shuffle_name;
}

function load_game(game_id)
{
	load_shuffle(game_id);

	var s = localStorage.getItem(PACKAGE + '.game.' + game_id + '.player_names');
	if (s) {
		G.player_names = JSON.parse(s);
	}

	G.active_player = 1;
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

	history.pushState(null, null, BASE_URL + '#pick_game/' + rules_key);
	on_state_init();
	return false;
}

function generate_new_game_clicked()
{
	G = {};
	G.rules = parse_rules(document.pick_game_form.rules.value);
	var shuffle_id = generate_decks();

	var u = BASE_URL + '#'+shuffle_id+'/names';
	history.pushState(null, null, u);
	on_state_init();
}

function init_player_names_page($pg, shuffle_id)
{
	load_shuffle(shuffle_id);

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
		$('.player'+i+' .role', $pg).text(G.roles[i]);
	}
}

function submit_player_names_form()
{
	var f = document.player_names_form;
	G.player_names = {
		'1': f.player1.value,
		'2': f.player2.value,
		'3': f.player3.value,
		'4': f.player4.value
		};
	var randomize = f.randomize_order.checked;

	localStorage.setItem(PACKAGE+'.game.'+G.shuffle_id+'.player_names',
		JSON.stringify(G.player_names)
		);

	var u = BASE_URL + '#'+G.shuffle_id+'/deck_setup';
	history.pushState(null, null, u);
	on_state_init();

	return false;
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
		var $x = $('<li></li>');
		$x.text(c);
		$('.3cube_cities').append($x);
	}

	$('.2cube_cities').empty();
	for (var i = 3; i < 6; i++) {
		var c = G.infection_discards[i];
		var $x = $('<li></li>');
		$x.text(c);
		$('.2cube_cities').append($x);
	}

	$('.1cube_cities').empty();
	for (var i = 6; i < G.infection_discards.length; i++) {
		var c = G.infection_discards[i];
		var $x = $('<li></li>');
		$x.text(c);
		$('.1cube_cities').append($x);
	}
}

function continue_after_board_setup()
{
	var u = BASE_URL + '#'+G.shuffle_id+'/player_setup';
	history.pushState(null, null, u);
	on_state_init();

	return false;
}

function init_player_setup_page($pg, shuffle_id)
{
	load_game(shuffle_id);

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
		$('.player'+i+' .card_list', $pg).empty();
		for (var j = 0; j < G.initial_hands[i].length; j++) {
			var c = G.initial_hands[i][j];
			var $c = make_player_card(c);
			$('.player'+i+' .card_list', $pg).append($c);
		}
	}
}

function make_player_card(c)
{
	var ci = City_Info[c];

	var $x = $('<li><img src="" class="card_icon"><span class="card_name"></span></li>');
	if (ci) {
		$('.card_name', $x).text(ci.name);
		$x.addClass(ci.color + '_card');
	}
	else {
		$('.card_name', $x).text(c);
		$x.addClass('special_card');
	}

	return $x;
}

function make_infection_card(c)
{
	var ci = City_Info[c];

	var $x = $('<li><span class="infection_card"><img src="" class="card_icon"><span class="card_name"></span></span></li>');
	$('.card_name', $x).text(ci.name);
	$x.addClass(ci.color + '_card');
	return $x;
}

function continue_after_player_setup()
{
	navigate_to_current_turn();
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
	G.pending_epidemics--;

	G.infection_discards.push(c);
}

function debug_infection_discards()
{
var s = '';
for (var i = 0; i < G.infection_discards.length; i++) {
	s += G.infection_discards[i] + ',';
}
console.log('infection pile is '+s);
}

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
		G.infection_discards.push(c);
		G.pending_infection--;
	}
	else {

		G.active_player = G.active_player % G.rules.player_count + 1;
		G.step = 'actions';
		G.time++;
		G.turns++;
	}
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
			}
			else {
				G.hands[G.active_player].push(c1);
			}

			if (is_epidemic(c2)) {
				G.pending_epidemics++;
			}
			else {
				G.hands[G.active_player].push(c2);
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

function do_special_event(c)
{
	console.log("special event "+c);

	if (c == 'One Quiet Night') {
		G.one_quiet_night = 1;
	}
	else if (c == 'Commercial Travel Ban') {
		G.travel_ban = G.rules.player_count;
		console.log("travel ban in effect");
	}

	G.time++;
}

function init_player_turn_page($pg)
{
	$('.page_header .player_name', $pg).text(
			G.player_names[G.active_player]
			);
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
	$('.player_name', $pg).text(
			G.player_names[G.active_player]
			);

	$('.card_list', $pg).empty();
	var c1 = G.current.cards_drawn[0];
	var c2 = G.current.cards_drawn[1];
	$('.card_list', $pg).append(make_player_card(c1));
	$('.card_list', $pg).append(make_player_card(c2));

	if (G.pending_epidemics > 0) {
		$('.goto_epidemic_btn', $pg).show();
		$('.goto_infection_btn', $pg).hide();
	}
	else {
		$('.goto_epidemic_btn', $pg).hide();
		$('.goto_infection_btn', $pg).show();
	}
}

function init_epidemic_page($pg)
{
	var c = G.current.epidemic;
	$('.card_list', $pg).empty();
	$('.card_list', $pg).append(
		make_infection_card(c)
		);

	if (G.pending_epidemics > 0) {
		$('.goto_epidemic_btn', $pg).show();
		$('.goto_infection_btn', $pg).hide();
	}
	else {
		$('.goto_epidemic_btn', $pg).hide();
		$('.goto_infection_btn', $pg).show();
	}
}

function is_epidemic(c)
{
	return c == 'Epidemic';
}

function init_infection_page($pg)
{
	$('.card_list', $pg).empty();
	$('.card_list', $pg).append(
		make_infection_card(
			G.current.infection
			));

	if (G.pending_infection > 0) {
		$('.pending_infection_div').show();
		$('.pending_infection_count').text(G.pending_infection);
		$('.goto_infection_btn').show();
		$('.goto_player_turn_btn').hide();
	}
	else {
		$('.pending_infection_div').hide();

		$('.player_name', $pg).text(
			G.player_names[
				1+(G.active_player%G.rules.player_count)
				]);
		$('.goto_infection_btn').hide();
		$('.goto_player_turn_btn').show();
	}
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

	var u = BASE_URL + '#'+shuffle_id+'/names';
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

function set_move(m)
{
	localStorage.setItem(PACKAGE + '.game.' + G.shuffle_id + '.T' + G.time, m);
	do_move(m);
	navigate_to_current_turn();
	return;
}

function on_special_event_clicked()
{
	var s =  this.getAttribute('data-special-event');

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

function admit_defeat_clicked()
{
	return set_move('give_up');
}

function declare_victory_clicked()
{
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
			make_infection_card(c)
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

function check_version(shuffle_id)
{
	var v = localStorage.getItem(PACKAGE + '.shuffle_version.' + shuffle_id);
	return (v == Version);
}

function init_pick_game_page($pg, rulestr)
{
	document.pick_game_form.rules.value = rulestr;

	$('.preshuffle_row[data-shuffle-id]').remove();
	var a = stor_get_list(PACKAGE + '.deals_by_rules.' + rulestr);
	for (var i = 0; i < a.length; i++) {

		if (!check_version(a[i])) {
			continue;
		}

		var $tr = $('.preshuffle_row.template').clone();
		$tr.removeClass('template');
		$('button',$tr).text(shuffle_name(a[i]));
		$('button',$tr).attr('data-shuffle-id', a[i]);
		$('button',$tr).click(on_preshuffled_game_clicked);
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
		return show_page('create_game_page');
	}
	else if (m = path.match(/^pick_game\/(.*)$/)) {
		var $pg = show_page('pick_game_page');
		return init_pick_game_page($pg, m[1]);
	}
	else if (m = path.match(/^([0-9a-f]+)\/names$/)) {
		var $pg = show_page('player_names_page');
		return init_player_names_page($pg, m[1]);
	}
	else if (m = path.match(/^([0-9a-f]+)\/deck_setup$/)) {
		var $pg = show_page('deck_setup_page');
		return init_deck_setup_page($pg, m[1]);
	}
	else if (m = path.match(/^([0-9a-f]+)\/board_setup$/)) {
		var $pg = show_page('board_setup_page');
		return init_board_setup_page($pg, m[1]);
	}
	else if (m = path.match(/^([0-9a-f]+)\/player_setup$/)) {
		var $pg = show_page('player_setup_page');
		return init_player_setup_page($pg, m[1]);
	}
	else if (m = path.match(/^([0-9a-f]+)\/T([\d-]+)/)) {
		load_game_at(m[1], m[2]);
		if (G.step == 'actions') {
			var $pg = show_page('player_turn_page');
			return init_player_turn_page($pg);
		}
		else if (G.step == 'draw_cards') {
			var $pg = show_page('draw_cards_page');
			return init_draw_cards_page($pg);
		}
		else if (G.step == 'epidemic') {
			var $pg = show_page('epidemic_page');
			return init_epidemic_page($pg);
		}
		else if (G.step == 'infection') {
			var $pg = show_page('infection_page');
			return init_infection_page($pg);
		}
		else if (G.step == 'end') {
			var $pg = show_page('game_completed_page');
			return init_game_completed_page($pg);
		}
	}
}

$(function() {
	window.addEventListener('popstate', on_state_init);
	on_state_init();
});

$(function() {
	$('.cure_count').change(update_game_score);
});

function skip_clicked()
{
	history.pushState(null, null, BASE_URL);
	on_state_init();
}
