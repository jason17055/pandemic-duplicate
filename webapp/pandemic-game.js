var Roles = [
	// original roles
	'Dispatcher',
	'Operations Expert',
	'Scientist',
	'Medic',
	'Researcher',

	// 2nd edition roles
	'Quarantine Specialist',
	'Contingency Planner',

	// expansion roles from "On The Brink" (those supported, anyway)
	'Field Operative',
	'Containment Specialist',
	'Generalist',
	'Archivist',
	'Epidemiologist',
	'Troubleshooter',

	// expansion roles from "In The Lab"
	'Pilot',
	'Local Liaison',
	'Field Director',
	'Virologist'
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
	'Bogota': 'Bogot\u00e1',      //Bogotá
	'Sao Paulo': 'S\u00e3o Paulo' //São Paulo
	};
var Disease_Names = {
	'black': 'Black',
	'blue': 'Blue',
	'red': 'Red',
	'yellow': 'Yellow',
	'purple': 'Purple'
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
	'Special Orders',

	// specials from the "In the Lab" expansion
	'Infection Zone Ban',
	'Sequencing Breakthrough',
	'Improved Sanitation'
	];

var Epidemics = [
	// virulent strain epidemics from "On the Brink" expansion
	'Chronic Effect',
	'Complex Molecular Structure',
	'Government Interference',
	'Hidden Pocket',
	'Rate Effect',
	'Slippery Slope',
	'Unacceptable Loss',
	'Uncounted Populations',

	// virulent strain epidemics from "In the Lab" expansion
	'Highly Contagious',
	'Resistant to Treatment'
	];

var Sequences = [
	'Small Black',
	'Small Red',
	'Small Yellow',
	'Small Blue',
	'Black and Red',
	'Blue and Black',
	'Red and Yellow',
	'Red and Blue',
	'Yellow and Blue',
	'Black and Yellow',
	'Big Black',
	'Big Yellow',
	'Big Red',
	'Big Blue'
	];

var Counts = [];
Counts['none'] = {
	'num_specials': 5,
	'num_roles': 7,
	'num_epidemics': 0,
	'num_sequences': 0
}
Counts['on_the_brink'] = {
	'num_specials': 13,
	'num_roles': 13,
	'num_epidemics': 8,
	'num_sequences': 0
}
Counts['in_the_lab'] = {
	'num_specials': 16,
	'num_roles': 17,
	'num_epidemics': 10,
	'num_sequences': 14
}

var City_Info = {};
for (var i = 0; i < Cities.length; i++) {
	var ci = {
		'id': Cities[i],
		'name': Translated_City_Names[Cities[i]] || Cities[i],
		'color': (i < 12 ? 'blue' : i < 24 ? 'yellow' : i < 36 ? 'black' : 'red')
		};
	City_Info[ci.id] = ci;
}

Pandemic = {
	'Roles': Roles,
	'Specials': Specials,
	'Cities': City_Info,
	'Diseases': Disease_Names,
	'MAX_PLAYERS': 5
	};

function shuffle_array(A)
{
	for (var i = 0; i < A.length; i++) {
		var j = i + Math.floor(Math.random() * (A.length-i));
		var tmp = A[i];
		A[i] = A[j];
		A[j] = tmp;
	}
}

function stringify_rules(R)
{
	return R.expansion+'-'+R.player_count+'p-'+R.level+'x' +
		(R.virulent_strain ? '-virulent_strain' : '') +
		(R.lab_challenge ? '-lab_challenge' : '') +
		(R.mutation_challenge ? '-mutation_challenge' : '') +
		(R.worldwide_panic ? '-worldwide_panic' : '');
}

function parse_rules(s)
{
	var ss = s.split(/-/);
	var ret = {
	'expansion': ss[0],
	'player_count': +ss[1].substring(0, ss[1].length-1),
	'level': +ss[2].substring(0, ss[2].length-1),
	'virulent_strain': false,
	'mutation_challenge': false,
	'worldwide_panic': false,
	'lab_challenge': false,
	};
	for (var i = 3; i < ss.length; i++) {
		switch (ss[i]) {
			case 'lab_challenge':
				ret.lab_challenge = true;
				break;
			case 'virulent_strain':
				ret.virulent_strain = true;
				break;
			case 'mutation_challenge':
				ret.mutation_challenge = true;
				break;
			case 'worldwide_panic':
				ret.worldwide_panic = true;
				break;
		}
	}
	return ret;
}

function generate_scenario_real(rules)
{
	var G = {};
	G.rules = rules;

	var num_specials = Counts[G.rules.expansion].num_specials || Specials.length;
	var num_roles = Counts[G.rules.expansion].num_roles || Roles.length;
	var num_epidemics = G.rules.virulent_strain ? Counts[G.rules.expansion].num_epidemics || Epidemics.length : 0;
	var num_sequences = G.rules.lab_challenge ? Counts[G.rules.expansion].num_sequences || Sequences.length : 0;

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

	if (G.rules.lab_challenge) {
		find_and_remove_card(R, 'Field Operative');
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

	var E = [];
	for (var i = 0; i < num_epidemics; i++) {
		E.push('Epidemic: ' + Epidemics[i]);
	}
	shuffle_array(E);

	while (E.length < G.rules.level) {
		E.push('Epidemic');
	}

	var piles = [];
	for (var i = 0; i < G.rules.level; i++) {
		piles.push([E.shift()]);
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

	G.sequence_deck = [];
	for (var i = 0; i < num_sequences; i++) {
		G.sequence_deck.push(Sequences[i]);
	}
	shuffle_array(G.sequence_deck);

	G.infection_deck = [];
	for (var i = 0; i < Cities.length; i++) {
		G.infection_deck.push(Cities[i]);
	}
	shuffle_array(G.infection_deck);

	G.player_discards = [];

	for (var k = 1; k <= G.rules.level; k++) {
		var a = [];
		for (var i = 0; i < Cities.length; i++) {
			a.push(Cities[i]);
		}
		shuffle_array(a);
		G['epidemic.'+k] = a;
	}

	return G;
}

function generate_scenario(rules)
{
	var G = generate_scenario_real(rules);

	var X = {
	'initial_hands': G.initial_hands,
	'roles': G.roles,
	'player_deck': G.player_deck,
	'infection_deck': G.infection_deck,
	'sequence_deck': G.sequence_deck,
	'rules': G.rules
	};
	for (var k = 1; k <= G.rules.level; k++) {
		X['epidemic.'+k] = G['epidemic.'+k];
	}

	var XX = JSON.stringify(X);
	G.scenario_id = (""+CryptoJS.SHA1(XX)).substring(0,18);
	G.shuffle_id = G.scenario_id;

console.log('saving scenario ' + G.scenario_id);
	localStorage.setItem(PACKAGE + '.scenario.' + G.scenario_id, XX);
	stor_add_to_set(PACKAGE + '.scenarios_by_rules.' + stringify_rules(G.rules), G.scenario_id);
	stor_add_to_set(PACKAGE + '.scenarios_by_player_count.' + G.rules.player_count, G.scenario_id);
	stor_add_to_set(PACKAGE + '.pending_scenarios', G.scenario_id);

	trigger_sync_process();

	return G;
}
