function submit_create_game_form()
{
	var f = document.create_game_form;
	var player_count = f.player_count.value;
	var rules = f.rules.value;
	var challenge = f.challenge.value;

	show_page("player_names_page");
	return false;
}

function submit_player_names_form()
{
	return false;
}

function show_page(page_name)
{
	$(".page").hide();
	$("#"+page_name).show();
}

$(function() {
	show_page('create_game_page');
});
