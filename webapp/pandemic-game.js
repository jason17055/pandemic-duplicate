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

var Mutations = [
	'The Mutation Spreads',
	'The Mutation Threatens',
	'The Mutation Intensifies'
];

var Hinterlands_Die = [
	'black',
	'blue',
	'red',
	'yellow',
	'blank',
	'blank'
];

var Expansions = [
	'base',
	'base2013',
	'on_the_brink',
	'in_the_lab',
	'state_of_emergency'
];

// the order of modules in this list determines the order they should
// be encoded in a Rules string.
var Module_Names = [
	'virulent_strain',
	'lab_challenge',
	'mutation_challenge',
	'worldwide_panic',
	'quarantines',
	'hinterlands_challenge',
	'emergency_event_challenge',
	'superbug_challenge'
];

var Contents = [];
Contents['base'] = {
	'Roles': [
		'Dispatcher',
		'Operations Expert',
		'Scientist',
		'Medic',
		'Researcher'
	],
	'Specials': [
		'Airlift',
		'Forecast',
		'Government Grant',
		'One Quiet Night',
		'Resilient Population'
	]
}
Contents['base2013'] = {
	'Roles': [
		'Quarantine Specialist',
		'Contingency Planner'
	]
}
Contents['on_the_brink'] = {
	'Roles': [
		'Field Operative',
		'Containment Specialist',
		'Generalist',
		'Archivist',
		'Epidemiologist',
		'Troubleshooter'
	],
	'Specials': [
		'Borrowed Time',
		'Commercial Travel Ban',
		'Mobile Hospital',
		'New Assignment',
		'Rapid Vaccine Deployment',
		'Re-examined Research',
		'Remote Treatment',
		'Special Orders'
	],
	'Epidemics': [
		'Chronic Effect',
		'Complex Molecular Structure',
		'Government Interference',
		'Hidden Pocket',
		'Rate Effect',
		'Slippery Slope',
		'Unacceptable Loss',
		'Uncounted Populations'
	]
}
Contents['in_the_lab'] = {
	'Roles': [
		'Pilot',
		'Local Liaison',
		'Field Director',
		'Virologist'
	],
	'Specials': [
		'Infection Zone Ban',
		'Sequencing Breakthrough',
		'Improved Sanitation'
	],
	'Epidemics': [
		'Highly Contagious',
		'Resistant to Treatment'
	],
	'Sequences': [
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
	]
}
Contents['state_of_emergency'] = {
	'Roles': [
		'Colonel',
		'First Responder',
		'Pharmacist',
		'Veterinarian',
		'Gene Splicer'
	],
	'Specials': [
		'Emergency Response',
		'Advance Team',
		'Local Initiative',
		'Resource Planning',
		'Sample Delivery',
		'Emergency Conference',
		'Infection Rumor'
	],
	'Emergencies': [
		'CDC Planes Grounded',
		'Limited Options',
		'Containment Failure',
		'Patient Zero',
		'Disease Hot Spot',
		'Widespread Panic',
		'Logistics Failure',
		'Sanitation Breakdown',
		'Time Runs Out',
		'Disease Zones Expand'
	]
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

var Conditions = {
	'Field Operative': function(rules) { return !rules.lab_challenge },
	'Colonel': function(rules) { return rules.quarantines },
	'Veterinarian': function(rules) { return rules.hinterlands_challenge },
	'Local Initiative': function(rules) { return rules.quarantines },
}

Pandemic = {
	'Contents': Contents,
	'Cities': City_Info,
	'Diseases': Disease_Names,
	'Conditions': Conditions,
	'MAX_PLAYERS': 5
	};

function is_valid_card(card, rules)
{
	return (!Pandemic.Conditions[card] || Pandemic.Conditions[card](rules));
}

function get_deck(name, rules)
{
	deck = [];

	var expansions = [];
	for (var i = 0; i < Expansions.length; i++) {
		expansions.push(Expansions[i]);
		if (rules.expansion == Expansions[i]) {
			break;
		}
	}

	var cur;
	for (var i = 0; i < expansions.length; i++) {
		cur = Pandemic.Contents[expansions[i]][name];
		if (cur) {
			for (var j = 0; j < cur.length; j++) {
				if (!rules || is_valid_card(cur[j], rules)) {
					deck.push(cur[j]);
				}
			}
		}
	}
	return deck;
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

function stringify_rules(R)
{
	var ret = R.player_count + 'p-' + R.level + 'x-' + R.expansion;
	for (var i = 0; i < Module_Names.length; i++) {
		if (R[Module_Names[i]]) {
			ret = ret + '-' + Module_Names[i];
		}
	}
	return ret;
}

function parse_rules(s)
{
	var R = {};

	var ss = s.split(/-/);
	if (ss[0].match(/^(\d+)p/)) {
		// new-style rules string (player-count first)
		ret.player_count = +ss[0].substring(0, ss[0].length-1);
		ret.level = +ss[1].substring(0, ss[1].length-1);
		ret.expansion = ss[2];
	}
	else {
		// old-style rules string (expansion first)
		ret.expansion = ss[0];
		ret.player_count = +ss[1].substring(0, ss[1].length-1);
		ret.level = +ss[2].substring(0, ss[2].length-1);
	}

	for (var i = 0; i < Module_Names.length; i++) {
		ret[Module_Names[i]] = false;
		for (var j = 3; j < ss.length; j++) {
			if (ss[j] == Module_Names[i]) {
				ret[Module_Names[i]] = true;
				break;
			}
		}
	}

	return ret;
}

function hinterlands_roll()
{
	var i = Math.floor(Math.random() * (Hinterlands_Die.length));
	return Hinterlands_Die[i];
}

function generate_scenario_real(rules)
{
	var G = {};
	G.rules = rules;

	var S = get_deck('Specials', G.rules);
	shuffle_array(S);

	var A = [];
	for (var i = 0; i < Cities.length; i++) {
		A.push(Cities[i]);
	}

	var num_specials_avail = G.rules.expansion == 'none' ? 5 : G.rules.player_count*2;
	for (var i = 0; i < S.length && i < num_specials_avail; i++) {
		A.push(S[i]);
	}

	var R = get_deck('Roles', G.rules);
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

	if (G.rules.mutation_challenge || G.rules.worldwide_panic) {
		for (var i = 0; i < Mutations.length; i++) {
			A.push('Mutation: ' + Mutations[i]);
		}
		shuffle_array(A);
	}

	var E = [];
	if (G.rules.virulent_strain) {
		var vs = get_deck('Epidemics', G.rules);
		shuffle_array(vs);
		for (var i = 0; i < G.rules.level && i < vs.length; i++) {
			E.push('Epidemic: ' + vs[i]);
		}
	}

	while (E.length < G.rules.level) {
		E.push('Epidemic');
	}

	var piles = [];
	for (var i = 0; i < G.rules.level; i++) {
		piles.push([E.shift()]);
	}

	if (G.rules.emergency_event_challenge) {
		var ee = get_deck('Emergencies', G.rules);
		shuffle_array(ee);
		for (var i = 0; i < G.rules.level && ee.length > 0; i++) {
			piles[i].push("Emergency: " + ee.pop());
		}
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

	if (G.rules.lab_challenge) {
		G.sequence_deck = get_deck('Sequences', G.rules);
		shuffle_array(G.sequence_deck);
	}

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
		if (G.rules.mutation_challenge) {
			a.push('Mutation{1}: Mutation');
			a.push('Mutation{2}: Mutation');
		}
		else if (G.rules.worldwide_panic) {
			a.push('Mutation{1}: Worldwide Panic');
			a.push('Mutation{2}: Worldwide Panic');
		}
		shuffle_array(a);
		G['epidemic.'+k] = a;
	}

	if (G.rules.hinterlands_challenge) {
		G.hinterlands_rolls = [];
		for (var i = 0; i < G.player_deck.length / 2 + 1; i++) {
			G.hinterlands_rolls.push(hinterlands_roll());
		}
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

	if (G.rules.hinterlands_challenge) {
		X.hinterlands_rolls = G.hinterlands_rolls;
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
