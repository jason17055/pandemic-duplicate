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
	'Expansions': Expansions,
	'Module_Names': Module_Names,
	'MAX_PLAYERS': 5
	};

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

function is_valid_card(card, rules)
{
	return (!Pandemic.Conditions[card] || Pandemic.Conditions[card](rules));
}

function get_deck(name, rules, gen_options)
{
	deck = [];

	var expansions = [];
	for (var i = 0; i < Expansions.length; i++) {
		if (Expansions[i] == 'base' || rules[Expansions[i]]) {
			expansions.push(Expansions[i]);
		}
		if (Expansions[i] == 'base2013' && !(gen_options && gen_options.nobase2013)) {
			expansions.push(Expansions[i]);
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
	var ret = R.player_count + 'p-' + R.level + 'x';
	for (var i = 0; i < Expansions.length; i++) {
		if (R[Expansions[i]]) {
			ret = ret + '-' + Expansions[i];
		}
	}
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

	// initialize rules struct
	for (var i = 0; i < Expansions.length; i++) {
		R[Expansions[i]] = false;
	}
	for (var i = 0; i < Module_Names.length; i++) {
		R[Module_Names[i]] = false;
	}

	var ss = s.split(/-/);
	for (var i = 0; i < ss.length; i++) {
		var t = ss[i];
		var m = t.match(/^(\d+)p$/);
		if (m) {
			// specifies player-count
			R.player_count = parseInt(m[1]);
			continue;
		}

		m = t.match(/^(\d+)x$/);
		if (m) {
			// specifies number of epidemics
			R.level = parseInt(m[1]);
			continue;
		}

		if (t == 'none' || t == 'base') {
			// old way of describing no expansions
			continue;
		}

		// check if this match's a known expansion or module
		for (var j = 0; j < Expansions.length; j++) {
			if (t == Expansions[j]) {
				R[Expansions[j]] = true;
			}
		}
		for (var j = 0; j < Module_Names.length; j++) {
			if (t == Module_Names[j]) {
				R[Module_Names[j]] = true;
			}
		}
	}

	return R;
}

function hinterlands_roll()
{
	var i = Math.floor(Math.random() * (Hinterlands_Die.length));
	return Hinterlands_Die[i];
}

/** Constructor */
Pandemic.GameState = function() {
};

Pandemic.GameState.deserialize = function(scenario_id, str) {
	var G = new Pandemic.GameState();
	var X = JSON.parse(str);
	for (var k in X) {
		G[k] = X[k];
	}
	G.scenario_id = scenario_id;

	if (G.rules.expansion) {
		// fix old-style way of indicating expansion
		G.rules[G.rules.expansion] = true;
	}
	return G;
};

Pandemic.GameState.prototype.count_cured_diseases = function() {
	var count = 0;
	for (var disease_color in Pandemic.Diseases) {
		if (this.is_cured(disease_color)) {
			count++;
		}
	}
	return count;
};

Pandemic.GameState.prototype.count_uncured_diseases = function() {
	var total = (this.rules.mutation_challenge || this.rules.worldwide_panic) ? 5 : 4;
	return total - this.count_cured_diseases();
};

Pandemic.GameState.prototype.discarded_special_event = function(s) {
	for (var i = 0; i < this.player_discards.length; i++) {
		if (this.player_discards[i] == s) {
			return true;
		}
	}
	return false;
};

Pandemic.GameState.prototype.do_discover_cure = function(disease_color) {
	this.diseases[disease_color] = 'cured';
	this.history.push({
		'type':'discover_cure',
		'player': this.active_player,
		'disease':disease_color
		});

	if (this.count_uncured_diseases() == 0) {
		this.step = 'end';
		this.result = 'victory';
	}
	this.time++;
};

Pandemic.GameState.prototype.do_draw_sequence = function() {
	var pid = this.active_player;

	var c = this.sequence_deck.shift();

	this.history.push({
		'type':'draw_sequence_card',
		'player':pid,
		'card':c
		});

	this.sequence_discards.push(c);

	this.time++;
};

Pandemic.GameState.prototype.do_eradicate = function(disease_color) {
	this.diseases[disease_color] = 'eradicated';
	this.history.push({
		'type':'eradicate',
		'disease':disease_color
		});

	if (this.rate_effect && disease_color == this.virulent_strain) {
		this.history.push({
			'type': 'rate_effect_deactivate'
			});
	}

	this.time++;
};

Pandemic.GameState.prototype.do_forecast = function(s) {
	var cardlist = [];
	var m;
	while (m = /^"([^"]+)"\s*(.*)$/.exec(s)) {
		cardlist.push(m[1]);
		s = m[2];
	}

	for (var i = 0; i < cardlist.length; i++) {
		this.infection_deck.pop();
	}
	for (var i = cardlist.length-1; i >= 0; i--) {
		this.infection_deck.push(cardlist[i]);
	}

	this.time++;
	this.step = this.after_forecast_step;
	delete this.after_forecast_step;
};

Pandemic.GameState.prototype.do_hinterlands_infection = function() {
	var c = this.hinterlands_rolls.pop();
	if (c == 'blank') {
		this.history.push({
			'type': 'hinterlands_dud'
			});
	}
	else {
		this.history.push({
			'type': 'hinterlands_infection',
			'color': c
			});
	}

	this.step = 'infection';
	this.time++;
};

Pandemic.GameState.prototype.do_more_infection = function() {
	if (this.pending_infection > 0) {

		this.step = 'infection';
		this.time++;

		var c = this.infection_deck.pop();
		if (is_mutation(c)) {
			this.history.push({
				'type': 'draw_infection_mutation',
				'card': c
				});

			if (this.is_eradicated('purple')) {
				this.history.push({
					'type': 'mutation_dud',
					'mutation': is_mutation(c)
					});
			}
			else {
				this.pending_mutations.push(c);
				this.do_mutation();
			}

			this.pending_infection--;
		}
		else {
			this.current = {
				'infection': c
				};
			this.history.push({
				'type': 'infection',
				'infection': c
				});
			this.infection_discards.push(c);
			this.pending_infection--;
			if (this.rate_effect && !this.rate_effect_extra_drawn &&
				!this.is_eradicated(this.virulent_strain) &&
				this.virulent_strain == Pandemic.Cities[c].color) {
				this.pending_infection++;
				this.rate_effect_extra_drawn = true;
				this.history.push({
					'type': 'rate_effect_trigger'
					});
			}
		}
	}
	else {

		this.active_player = this.active_player % this.rules.player_count + 1;
		this.history.push({
			'type': 'next_turn',
			'active_player': this.active_player
			});
		this.step = 'actions';
		this.time++;
		this.turns++;
	}
};

Pandemic.GameState.prototype.do_move = function(m) {
	var mm = m.split(/ /);
	if (m == 'pass') {

		if (this.step == 'actions') {

			// end of actions phase
			this.step = 'draw_cards';
			this.time++;

			// draw two player cards
			var c1 = this.player_deck.pop();
			var c2 = this.player_deck.pop();
			this.current = {
				'cards_drawn': [c1, c2]
				};

			this.pending_epidemics = 0;
			if (is_epidemic(c1)) {
				this.epidemic_drawn(c1);
			}
			else if (is_mutation(c1)) {
				this.mutation_drawn(c1);
			}
			else {
				this.hands[this.active_player].push(c1);
				this.history.push({
					'type': 'draw_card',
					'player': this.active_player,
					'card': c1
					});
			}

			if (is_epidemic(c2)) {
				this.epidemic_drawn(c2);
			}
			else if (is_mutation(c2)) {
				this.mutation_drawn(c2);
			}
			else {
				this.hands[this.active_player].push(c2);
				this.history.push({
					'type': 'draw_card',
					'player': this.active_player,
					'card': c2
					});
			}

		}
		else if (this.step == 'draw_cards') {

			if (this.pending_mutations.length > 0) {
				this.step = 'mutation';
				this.time++;
				this.do_mutation();
			}
			else if (this.pending_epidemics > 0) {
				this.start_epidemic();
			}
			else {
				this.start_infection();
			}
		}
		else if (this.step == 'mutation') {

			if (this.pending_mutations.length > 0) {
				this.time++;
				this.do_mutation();
			}
			else if (this.pending_epidemics > 0) {
				this.start_epidemic();
			}
			else {
				this.start_infection();
			}
		}
		else if (this.step == 'epidemic') {

			this.finish_epidemic();
			if (this.pending_epidemics > 0) {
				this.start_epidemic();
			}
			else {
				this.start_infection();
			}
		}
		else { // infection

			this.do_more_infection();
		}
	}
	else if (mm[0] == 'draw_sequence_card') {
		this.do_draw_sequence();
	}
	else if (mm[0] == 'special') {
		this.do_special_event(m.substring(8));
	}
	else if (mm[0] == 'retrieve') {
		this.do_retrieve_special_event(m.substring(9));
	}
	else if (mm[0] == 'virulent') {
		this.do_virulent_strain(mm[1]);
	}
	else if (mm[0] == 'discover') {
		this.do_discover_cure(mm[1]);
	}
	else if (mm[0] == 'eradicate') {
		this.do_eradicate(mm[1]);
	}
	else if (mm[0] == 'forecast') {
		this.do_forecast(m.substring(9));
	}
	else if (mm[0] == 'resource_planning') {
		this.do_resource_planning(m.substring(18));
	}
	else if (m == 'give_up') {
		this.step = 'end';
		this.result = 'loss'
		this.time++;
	}
	else if (m == 'claim_victory') {
		this.step = 'end';
		this.result = 'victory';
		this.time++;
	}
	else {

		console.log("unrecognized move: "+m);
		this.time++;
	}
};

Pandemic.GameState.prototype.do_mutation = function() {
	var mut = this.pending_mutations.shift();
	var mut_text = is_mutation(mut);
	if (mut_text == 'The Mutation Spreads') {
		for (var i = 0; i < 3; i++) {
			var c = this.infection_deck.shift();
			this.history.push({
				'type': 'mutation',
				'city': c,
				'count': 1
				});
			this.infection_discards.push(c);
		}
	}
	else if (mut_text == 'The Mutation Threatens') {
		var c = this.infection_deck.shift();
		this.history.push({
			'type': 'mutation',
			'city': c,
			'count': 3
			});
		this.infection_discards.push(c);
	}
	else if (mut_text == 'Mutation') {
		var c = this.infection_deck.shift();
		this.history.push({
			'type': 'mutation',
			'city': c,
			'count': 1
			});
		this.infection_discards.push(mut);
		this.infection_discards.push(c);
	}
	else if (mut_text == 'Worldwide Panic') {
		var c = this.infection_deck.shift();
		this.history.push({
			'type': 'mutation',
			'city': c,
			'count': 2
			});
		this.infection_discards.push(mut);
		this.infection_discards.push(c);
	}
};

Pandemic.GameState.prototype.do_resource_planning = function(s) {
	var cardlist = [];
	var m;
	while (m = /^"([^"]+)"\s*(.*)$/.exec(s)) {
		cardlist.push(m[1]);
		s = m[2];
	}

	for (var i = 0; i < cardlist.length; i++) {
		this.player_deck.pop();
	}
	for (var i = cardlist.length-1; i >= 0; i--) {
		this.player_deck.push(cardlist[i]);
	}

	this.time++;
	this.step = this.after_resource_planning_step;
	delete this.after_resource_planning_step;
};

Pandemic.GameState.prototype.do_retrieve_special_event = function(c) {
	var pid = this.active_player;
	if (!find_and_remove_card(this.player_discards, c))
		return null;
	if (this.contingency_event)
		return null;

	this.contingency_event = c;

	this.history.push({
		'type':'retrieve_special_event',
		'player':pid,
		'card':c
		});

	this.time++;
};

Pandemic.GameState.prototype.do_special_event = function(c) {
	var hfun = function(cc) {
		var pid = null;
		if (this.contingency_event == cc) {
			for (var i = 1; i <= this.rules.player_count; i++) {
				if (this.roles[i] == 'Contingency Planner') {
					pid = i;
					break;
				}
			}
			if (pid) {
				this.contingency_event = null;
			}
		}
		else {
			pid = this.find_and_remove_card_any_hand(cc);
		}
		if (!pid) { return null; }

		this.history.push({
			'type':'special_event',
			'player':pid,
			'card':cc
			});
		return pid;
	}.bind(this);

	var m;
	if (c == 'One Quiet Night') {
		if (hfun(c)) {
			this.one_quiet_night = 1;
		}
	}
	else if (c == 'Commercial Travel Ban') {
		if (hfun(c)) {
			this.travel_ban = this.rules.player_count;
		}
	}
	else if (c == 'Forecast') {
		if (hfun(c)) {
			if (this.step == 'epidemic') {
				this.finish_epidemic();
			}
			this.after_forecast_step = this.step;
			this.step = 'forecast';
		}
	}
	else if (c == 'Resource Planning') {
		if (hfun(c)) {
			this.after_resource_planning_step = this.step;
			this.step = 'resource_planning';
		}
	}
	else if (m = /^"Resilient Population" "(.*)"$/.exec(c)) {
		if (hfun("Resilient Population")) {
			find_and_remove_card(this.infection_discards, m[1]);
			this.history.push({
				'type':'resilient_population',
				'city':m[1]
				});
		}
	}
	else if (m = /^"Infection Rumor" "(.*)"$/.exec(c)) {
		if (hfun("Infection Rumor")) {
			find_and_remove_card(this.infection_deck, m[1]);
			this.infection_discards.push(this.infection_deck, m[1]);
			this.infection_rumor = true;
			this.history.push({
				'type':'infection_rumor',
				'city':m[1]
				});
		}
	}
	else if (m = /^"New Assignment" "([^"]*)" "([^"]*)"$/.exec(c)) {
		if (hfun("New Assignment")) {
			for (var i = 1; i <= this.rules.player_count; i++) {
				if (this.roles[i] == m[1]) {
					this.roles[i] = m[2];
					break;
				}
			}
			if (m[1] == 'Contingency Planner' && this.contingency_event) {
				this.player_discards.push(this.contingency_event);
				this.contingency_event = null;
			}
		}
	}
	else {
		hfun(c);
	}

	this.time++;
};

Pandemic.GameState.prototype.do_virulent_strain = function(disease_color) {
	this.virulent_strain = disease_color;
	this.history.push({
		'type':'virulent_strain',
		'disease':disease_color
		});

	this.step = 'epidemic';
	this.time++;

	this.resolve_vs_epidemic();
};

Pandemic.GameState.prototype.epidemic_drawn = function(c) {
	this.pending_epidemics++;
	this.history.push({
		'type': 'draw_epidemic',
		'epidemic_count': this.epidemic_count+this.pending_epidemics,
		'card': c
		});
	if (c != 'Epidemic') {
		this.player_discards.push(c);
		this.current_epidemic = c.substring(10);
	}
};

//returns the player-id of the player who had it
Pandemic.GameState.prototype.find_and_remove_card_any_hand = function(c) {
	for (var i = 1; i <= this.rules.player_count; i++) {
		var cc = find_and_remove_card(this.hands[i], c);
		if (cc) {
			this.player_discards.push(cc);
			return i;
		}
	}
	return null;
};

// Note: this function is called when the user clicks Next after an
// epidemic is processed.
// It is *also* called when a Forecast special event is played, as the
// Forecast is interested in the infection deck after the cards are
// reshuffled.
// In the case of Forecast, this function is called MULTIPLE times,
// the second time the infection discard pile is empty, so it has no
// effect.
//
Pandemic.GameState.prototype.finish_epidemic = function() {
	var a = this['epidemic.'+this.epidemic_count];
	if (!a) {
		alert('Oops, this game does not have an order defined for epidemic '+this.epidemic_count);
		return;
	}

	for (var i = a.length-1; i >= 0; i--) {

		var c = find_and_remove_card(this.infection_discards, a[i]);
		if (c) {
			this.infection_deck.push(c);
		}
	}
};

Pandemic.GameState.prototype.has_any_special_event = function() {
	if (this.contingency_event)
		return true;

	for (var pid in this.hands) {
		var h = this.hands[pid];
		for (var i = 0; i < h.length; i++) {
			if (is_special(h[i])) {
				return true;
			}
		}
	}
	return false;
};

Pandemic.GameState.prototype.has_special_event = function(s) {
	if (this.contingency_event == s)
		return true;

	for (var pid in this.hands) {
		var h = this.hands[pid];
		for (var i = 0; i < h.length; i++) {
			if (h[i] == s) {
				return true;
			}
		}
	}
	return false;
};

Pandemic.GameState.prototype.initialize = function() {

	this.active_player = 1;
	this.history = [];
	this.history.push({'type':'next_turn', 'active_player':1});
	this.time = 0;
	this.turns = 1;
	this.step = 'actions';
	this.hands = {};
	this.contingency_event = null;
	for (var i = 1; i <= this.rules.player_count; i++) {
		this.hands[i] = [];
		for (var j = 0; j < this.initial_hands[i].length; j++) {
			this.hands[i].push(this.initial_hands[i][j]);
		}
	}

	this.infection_rate = 2;
	this.infection_discards = [];
	for (var i = 0; i < 9; i++) {
		var c = this.infection_deck.pop();
		this.infection_discards.push(c);
	}

	this.diseases = {}; //identifies cured/eradicated diseases

	if (this.rules.mutation_challenge) {
		this.infection_discards.push("Mutation{1}: Mutation");
		this.infection_discards.push("Mutation{2}: Mutation");
	}
	else if (this.rules.worldwide_panic) {
		this.infection_discards.push("Mutation{1}: Worldwide Panic");
		this.infection_discards.push("Mutation{2}: Worldwide Panic");
	}
	else {
		this.diseases['purple'] = 'unnecessary';
	}

	this.sequence_discards = [];
	if (this.rules.lab_challenge && this.sequence_deck.length > 0) {
		var c = this.sequence_deck.shift();
		this.sequence_discards.push(c);
	}

	this.epidemic_count = 0;
	this.pending_mutations = [];

	this.player_discards = [];
	this.game_length_in_turns = 1+Math.floor(this.player_deck.length/2);
};

Pandemic.GameState.prototype.is_cured = function(disease_color) {
	return this.diseases[disease_color] == 'cured' || this.is_eradicated(disease_color);
};

Pandemic.GameState.prototype.is_eradicated = function(disease_color) {
	return this.diseases[disease_color] == 'eradicated';
};

Pandemic.GameState.prototype.is_unnecessary = function(disease_color) {
	return this.diseases[disease_color] == 'unnecessary';
};

Pandemic.GameState.prototype.mutation_drawn = function(c) {
	this.history.push({
		'type': 'draw_mutation',
		'card': c
		});

	if (this.is_eradicated('purple')) {
		this.history.push({
			'type': 'mutation_dud',
			'mutation': is_mutation(c)
			});
	}
	else if (is_mutation(c) == 'The Mutation Intensifies') {
		this.history.push({
			'type': 'mutation_intensifies'
			});
	}
	else {
		this.pending_mutations.push(c);
	}
};

Pandemic.GameState.prototype.start_epidemic = function() {
	this.step = 'epidemic';
	this.time++;

	this.epidemic_count++;
	this.infection_rate = this.epidemic_count < 3 ? 2 :
			this.epidemic_count < 5 ? 3 : 4;

	var c = this.infection_deck.shift();
	this.current = {
		'epidemic': c
		};
	this.history.push({
		'type': 'epidemic',
		'epidemic': c
		});
	this.pending_epidemics--;

	this.infection_discards.push(c);

	if (this.virulent_strain) {
		this.resolve_vs_epidemic();
	}
};

Pandemic.GameState.prototype.start_infection = function() {
	if (this.travel_ban) {
		this.travel_ban--;
		this.pending_infection = 1;
	}
	else if (this.one_quiet_night) {
		delete this.one_quiet_night;
		this.pending_infection = 0;
	}
	else {
		this.pending_infection = this.infection_rate;
	}
	if (this.infection_rumor) {
		this.pending_infection--;
		delete this.infection_rumor;
	}
	this.rate_effect_extra_drawn = false;

	if (this.rules.hinterlands_challenge) {
		this.do_hinterlands_infection();
	}
	else {
		this.do_more_infection();
	}
};

Pandemic.GameState.prototype.resolve_vs_epidemic = function() {
	var ep = this.current_epidemic;
	if (!ep) {
		return;
	}

	if (this.current_epidemic == 'Chronic Effect') {
		this.chronic_effect = true;
		this.history.push({
			'type': 'chronic_effect_activate',
			'disease': this.virulent_strain
			});
	}
	else if (ep == 'Complex Molecular Structure') {
		if (this.is_cured(this.virulent_strain)) {
			this.vs_dud(ep);
		}
		else {
			this.history.push({
				'type': 'complex_molecular_structure_activate',
				'disease': this.virulent_strain
				});
		}
	}
	else if (ep == 'Government Interference') {
		this.history.push({
			'type': 'government_interference_activate',
			'disease': this.virulent_strain
			});
	}
	else if (ep == 'Hidden Pocket') {
		if (!this.is_eradicated(this.virulent_strain)) {
			this.vs_dud(ep);
		}
		else {
			var count = 0;
			for (var i = 0; i < this.infection_discards.length; i++) {
				var c = this.infection_discards[i];
				var ci = Pandemic.Cities[c];
				if (ci.color == this.virulent_strain) {
					if (count == 0) {
						this.history.push({
							'type': 'hidden_pocket_activate',
							'disease': this.virulent_strain
							});
						this.diseases[this.virulent_strain] = 'cured';
						if (this.rate_effect) {
							this.history.push({
								'type': 'rate_effect_activate',
								'disease': this.virulent_strain
								});
						}
					}
					this.history.push({
						'type': 'hidden_pocket_infect',
						'city': c
						});
					count++;
				}
			}
			if (count == 0) {
				this.vs_dud(ep);
			}
		}
	}
	else if (ep == 'Rate Effect') {
		this.rate_effect = true;
		if (this.is_eradicated(this.virulent_strain)) {
			this.vs_dud(ep);
		}
		else {
			this.history.push({
				'type': 'rate_effect_activate',
				'disease': this.virulent_strain
				});
		}
	}
	else if (ep == 'Slippery Slope') {
		this.history.push({
			'type': 'slippery_slope_activate',
			'disease': this.virulent_strain
			});
	}
	else if (ep == 'Unacceptable Loss') {
		this.history.push({
			'type': 'unacceptable_loss',
			'disease': this.virulent_strain
			});
	}
	else if (ep == 'Uncounted Populations') {
		this.history.push({
			'type': 'uncounted_populations',
			'disease': this.virulent_strain
			});
	}
	else if (ep == 'Highly Contagious') {
		this.history.push({
			'type': 'highly_contagious_activate',
			'disease': this.virulent_strain
			});
	}
	else if (ep == 'Resistant to Treatment') {
		if (this.is_cured(this.virulent_strain)) {
			this.vs_dud(ep);
		}
		else {
			this.history.push({
				'type': 'resistant_to_treatment_activate',
				'disease': this.virulent_strain
				});
		}
	}
	else {
		console.log("Unrecognized epidemic: '" + ep + "'");
	}

	this.current_epidemic = null;
};

Pandemic.GameState.prototype.vs_dud = function(epidemic_name) {
	this.history.push({
		'type': 'vs_epidemic_dud',
		'epidemic': epidemic_name
		});
};

function generate_scenario_real(rules, gen_options)
{
	var G = new Pandemic.GameState();
	G.rules = rules;

	var S = get_deck('Specials', G.rules);
	shuffle_array(S);

	var A = [];
	for (var i = 0; i < Cities.length; i++) {
		A.push(Cities[i]);
	}

	var num_specials_avail;
	if (G.rules.on_the_brink || G.rules.in_the_lab || G.rules.state_of_emergency) {
		num_specials_avail = G.rules.player_count*2;
	}
	else {
		num_specials_avail = 5;
	}
	for (var i = 0; i < S.length && i < num_specials_avail; i++) {
		A.push(S[i]);
	}

	var R = get_deck('Roles', G.rules, gen_options);
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

function generate_scenario(rules, gen_options)
{
	var G = generate_scenario_real(rules, gen_options);

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
