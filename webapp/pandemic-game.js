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

function generate_scenario(rules)
{
	var G = {};
	G.rules = rules;

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
	G.scenario_id = (""+CryptoJS.SHA1(XX)).substring(0,18);
	G.shuffle_id = G.scenario_id;

	localStorage.setItem(PACKAGE + '.shuffle.' + G.shuffle_id, XX);
	stor_add_to_set(PACKAGE + '.deals_by_rules.' + stringify_rules(G.rules), G.shuffle_id);
	stor_add_to_set(PACKAGE + '.pending_scenario_uploads', G.shuffle_id);

	trigger_sync_process();

	return G;
}
