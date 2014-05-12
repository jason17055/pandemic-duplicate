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
	'Kalkuta',

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
var G = null;

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
	var A = [];
	for (var i = 0; i < Cities.length; i++) {
		A.push(Cities[i]);
	}
	// TODO- add special events

	shuffle_array(A);
	var hand_size = G.rules.player_count <= 2 ? 4 :
		G.rules.player_count == 3 ? 3 : 2;

	G.initial_hands = {};
	for (var i = 0; i < G.rules.player_count; i++) {
		var b = [];
		for (var j = 0; j < hand_size; j++) {
			var c = A.pop();
			b.push(c);
		}
		G.initial_hands[(1+i)] = b;
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
}

function submit_create_game_form()
{
	var f = document.create_game_form;
	var player_count = f.player_count.value;
	var rules = f.rules.value;
	var challenge = f.challenge.value;

	G = {};
	G.rules = {
		'player_count': player_count,
		'ruleset': rules,
		'level': challenge
		};
	generate_decks();

	show_page("player_names_page");
	var $pg = $('#player_names_page');
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

	return false;
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

	show_page('deck_setup_page');
	$('#player_cards_list').empty();
	for (var i = 0; i < G.player_deck.length; i++) {
		var c = G.player_deck[i];
		var $x = $('<li></li>');
		$x.text(c);
		$('#player_cards_list').append($x);
	}

	$('#infection_cards_list').empty();
	for (var i = 0; i < G.infection_deck.length; i++) {
		var c = G.infection_deck[i];
		var $x = $('<li></li>');
		$x.text(c);
		$('#infection_cards_list').append($x);
	}

	return false;
}

function continue_after_deck_setup()
{
	show_page('board_setup_page');

	$('.3cube_cities').empty();
	for (var i = 0; i < 3; i++) {
		var c = G.infection_deck[i];
		var $x = $('<li></li>');
		$x.text(c);
		$('.3cube_cities').append($x);
	}

	$('.2cube_cities').empty();
	for (var i = 3; i < 6; i++) {
		var c = G.infection_deck[i];
		var $x = $('<li></li>');
		$x.text(c);
		$('.2cube_cities').append($x);
	}

	$('.1cube_cities').empty();
	for (var i = 6; i < 9; i++) {
		var c = G.infection_deck[i];
		var $x = $('<li></li>');
		$x.text(c);
		$('.1cube_cities').append($x);
	}
}

function continue_after_board_setup()
{
	show_page('player_setup_page');

	var $pg = $('#player_setup_page');
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
		$('.player'+i+' .player_name', $pg).text(G.player_names[i]);
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
	var $x = $('<li></li>');
	$x.text(c);
	return $x;
}

function show_page(page_name)
{
	$(".page").hide();
	$("#"+page_name).show();
}

function on_state_init()
{
	var path = location.hash;
	if (path && path.substring(0,1) == '#') {
		path = path.substring(1);
	}

	if (!path) {
		return show_page('create_game_page');
	}
}

$(function() {
	window.addEventListener('popstate', on_state_init);
	on_state_init();
});
