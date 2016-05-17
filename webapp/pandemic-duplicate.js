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
}

function handle_ajax_error(jqx, status, errMsg)
{
	console.log('Ajax error: '+jqx.status + ' '+status+' '+errMsg);
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

function handle_channel_message(raw_message)
{
	var msg = JSON.parse(raw_message);
	if (msg.moves) {
		update_watched_game(msg.moves);
	}
}

var watched_game_info = {};
var watched_game_data = null;

function update_watched_game(moves_array)
{
	watched_game_data.moves = moves_array;
	reload_watched_game();
}

function show_watched_game(game_id, game_data)
{
	watched_game_info = {
		'game_id': game_id
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

	// trigger game page reload
	G.serial = (G.serial || 0) + 1;
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

	update_game_score();
}

function submit_player_names_form(pcount, names, randomize)
{
	if (randomize == 'full') {
		for (var i = 0; i < pcount; i++) {
			var j = i+Math.floor(Math.random() * (pcount-i));
			var tmp = names[1+i];
			names[1+i] = names[1+j];
			names[1+j] = tmp;
		}
	}
	else if (randomize == 'start_player') {
		var t = Math.floor(Math.random() * pcount);
		var p = {};
		for (var i = 0; i < Pandemic.MAX_PLAYERS; i++) {
			p[1+i] = i < pcount ?
				names[1+(i+t)%pcount] :
				names[1+i];
		}
		names = p;
	}
	return names;
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

function get_move(game_id, time)
{
	var mv = localStorage.getItem(PACKAGE + '.game.' + game_id + '.T' + time);
	return mv != null ? mv : 'pass';
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

function init_player_turn_page($pg)
{
	$('.in_action_phase', $pg).show();
	$('.in_infection_phase', $pg).hide();
}

function init_draw_cards_page($pg)
{
	$('.in_action_phase', $pg).hide();
	$('.in_infection_phase', $pg).hide();
}

function init_epidemic_page($pg)
{
	$('.in_action_phase', $pg).hide();
	$('.in_infection_phase', $pg).show();
	$('.pending_infection_div', $pg).hide();
}

function init_infection_page($pg)
{
	$('.in_action_phase', $pg).hide();
	$('.in_infection_phase', $pg).show();

	if (G.pending_infection > 0) {
		$('.pending_infection_div', $pg).show();
		$('.pending_infection_count', $pg).text(G.pending_infection);
	}
	else {
		$('.pending_infection_div', $pg).hide();
	}
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
	var tmpNames = localStorage.getItem(PACKAGE + '.player_names') || '';
	var tmp = Math.random()+'-'+Math.random()+'-'+tmpNames+'-'+
		scenario_id;
	return (""+CryptoJS.SHA1(tmp)).substring(0,18);
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

function on_special_event_clicked(GameService, s, gameController, $state)
{
	if (s == 'Resilient Population') {

		$state.go('active_game.resilient_population');
		return;
	}
	if (s == 'Infection Rumor') {

		$state.go('active_game.infection_rumor');
		return;
	}
	else if (s == 'New Assignment') {

		$state.go('active_game.new_assignment');
		return;
	}

	GameService.set_move('special '+s);
}

function record_game_finished()
{
	var timestr = new Date().toISOString();
	localStorage.setItem(PACKAGE + '.game.' + G.scenario_id + '.finished', timestr);
	localStorage.setItem(PACKAGE + '.game.' + G.game_id + '.finished', timestr);
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
		if (G.is_cured(disease_color) || G.is_unnecessary(disease_color)) {
			$(el).hide();
		}
		else {
			$(el).show();
		}
		});

	$('.eradicate_btn', $pg).each(function(idx,el) {
		var disease_color = el.getAttribute('data-disease');
		if (G.is_eradicated(disease_color) || !G.is_cured(disease_color) || G.is_unnecessary(disease_color)) {
			$(el).hide();
		}
		else {
			$(el).show();
		}
		});

	if (G.count_uncured_diseases() == 1 && !G.is_unnecessary('purple') && !G.is_cured('purple')) {
		$('.victory_button_container', $pg).show();
	}
	else {
		$('.victory_button_container', $pg).hide();
	}
}

function init_generate_game_page($pg, xtra)
{
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

function init_pick_scenario_page($pg, pcount, scenarios, c)
{
	document.pick_scenario_form.player_count.value = pcount;
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

	var published = localStorage.getItem(PACKAGE + '.current_game.published');
	var secret = localStorage.getItem(PACKAGE + '.game.' + game_id + '.owner_secret');
	var scenario_id = localStorage.getItem(PACKAGE + '.game.' + game_id + '.scenario');

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
		var tournamentInfo = localStorage.getItem(PACKAGE+'.game.'+game_id+'.tournament');
		if (tournamentInfo) {
			st['tournament_event'] = tournamentInfo;
		}
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
		var mv = get_move(G.game_id, t);
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

		// TODO- refresh data displayed on Subscription page
		S.loginUrl = data.loginUrl;
		S.logoutUrl = data.logoutUrl;
		S.userName = data.userName;

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
