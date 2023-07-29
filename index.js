var users = new Set()
var t_list = new Set()
const api_url = 'https://pools.jdfgc.net'

function getCookie(cname) {
    let name = cname + "=";
    let ca = document.cookie.split(';');
    for(let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) == ' ') {
        c = c.substring(1);
      }
      if (c.indexOf(name) == 0) {
        return c.substring(name.length, c.length);
      }
    }
    return "";
  }

function setCookie(cname, cvalue, exdays) {
    const d = new Date();
    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
    let expires = "expires="+d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
  }

async function acceptDisclaimer(){
    setCookie("accepted", "true", 14)
    disclaimer = document.getElementById("disclaimerContainer")
    disclaimer.style.display = "none"
}



async function getTournaments(){
    return await fetch(api_url + "?getTournaments=1")
    .then(response => response.json())
    .then(json => {
        var tournament_names = json;
        return tournament_names
    }) 
}


async function populateTournaments(){
    var tournaments = await getTournaments()
    tournaments = tournaments.tournaments
    for(const tournament in tournaments){
        var name = tournaments[tournament].tournament_name
        var slug = tournaments[tournament].tournament_slug.split('/')[1]
        t_list.add(slug)
        var tournament_div = document.createElement('div')
        tournament_div.className = "tournament_selection"
        tournament_div.id = slug
        var label = document.createElement('label')
        label.htmlFor = slug + "_checkbox"
        label.innerText = name
        tournament_div.appendChild(label)
        var checkBox = document.createElement('input')
        checkBox.type = "checkbox"
        checkBox.id = slug + "_checkbox"
        checkBox.value = slug
        checkBox.name = slug + "_checkbox"
        checkBox.className = "t_checkbox"
        checkBox.onclick = addTournament
        checkBox.checked = true;
        tournament_div.appendChild(checkBox)

        t_select = document.getElementById("TournamentSelection")
        t_select.appendChild(tournament_div)


    }

}

async function initialize(){
    disclaimerStatus = getCookie("accepted")
    if(disclaimerStatus != "true"){
        disclaimer = document.getElementById("disclaimerContainer")
        disclaimer.style.display = "flex"
    }
    const urlParams = new URL(window.location.href).searchParams
    const saved = urlParams.get('saved')
    const url_string = "?saved=" + saved
    if(saved){
        player_data = await fetch(api_url + url_string)
        .then(response => response.json())
        .then(json => {
            json['pools'].forEach(item=>{
                users.add(item.discriminator)
                t_list.add(item.tournament_slug.split("/")[1])
            })
            console.log(users)
            console.log(t_list)
        })
    }
    updatePage(player_data)
}
initialize()
populateTournaments()

function addUser(){
    var user = document.getElementById("addPlayer").value
    user = user.toLowerCase()
    user = user.split("/")
    console.log(user)
    var index = user.indexOf("user") + 1
    users.add(user[index])
    console.log(users)
    updatePage()
}



function getWaves(player_data){
    wave_data = []
    for(const player of player_data){
        const wave_index = wave_data.findIndex(
            (wave) => (wave.t_id === player.tournament_id) && (wave.wave_id === player.wave)
        )
        if(wave_index === -1){
            events = [{"event" : player.event_name, "players" : [player]}]
            wave_data.push({"slug" : player.tournament_slug, "t_id" : player.tournament_id, "t_name": player.tournament_name, "wave_id" : player.wave, "start_time": player.start_time, "events" : events})
        }
        else{
            event_index = wave_data[wave_index]['events'].findIndex(
                (e) => e.event === player.event_name
            )
            if(event_index === -1){
                wave_data[wave_index]['events'].push({"event" : player.event_name, "players" : [player]})
            }
            else{
                wave_data[wave_index]['events'][event_index].players.push(player)
            }
        }
    }
    wave_data.sort((a,b) => (a.start_time > b.start_time ? 1 : -1))
    return wave_data

}

async function getPlayers(user_list, tournament_list){
    url_string = ""
    console.log(users)
    if(users.size!= 0){
        url_string = "?users="
        for(const discriminator of users){
            url_string = url_string + discriminator + ","
        }
        url_string = url_string.slice(0,-1) + "&tournaments="
    }
    else{
        url_string = "?tournaments="
    }
    
    for(const slug of t_list){
        url_string = url_string + slug + ','
    }
    url_string = url_string.slice(0,-1)
    console.log(url_string)
    return await fetch(api_url + url_string)
    .then(response => response.json())
    .then(json => {
        player_data = json['pools']
        return player_data
    })

}

function addTournament(){
    t_list = new Set
    var tournaments = document.getElementsByClassName("tournament_selection")
    for(t of tournaments){
        checkBox = t.getElementsByClassName("t_checkbox")[0]
        if(checkBox.checked){
            t_list.add(checkBox.value)
        }
    }
    updatePage()
}

async function updatePage(saved_data=null){

    var old_waves = document.getElementsByClassName("wave")
    while(old_waves[0]){
        old_waves[0].parentNode.removeChild(old_waves[0])
    }
    sharable_link = document.getElementById('shareableLinkContainer')
    sharable_link.style.display = 'none'
    tagList = document.getElementById("playerList")
    all_tags = document.getElementsByClassName("playerTag")
    while(all_tags[0]){
        all_tags[0].parentNode.removeChild(all_tags[0])
    }
    var tags = new Set();
    var player_data
    if(saved_data){
        player_data = saved_data
    }
    else{
        player_data = await getPlayers(users, t_list)
    }
    wave_data = getWaves(player_data)
    console.log(wave_data)
    main_div = document.getElementById('main')
    for(const [key, data] of Object.entries(await wave_data)){
        console.log(data)
        wave_div = document.createElement('div')
        wave_div.className = "wave"
        wave_name = document.createElement('h2')
        timestamp = data['start_time']
        datetime = new Date(timestamp * 1000)
        now = new Date()
        days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thur', "Fri", "Sat"]
        day = days[datetime.getDay()]
        time = datetime.toLocaleString('en-US', {hour: 'numeric',minute:'numeric', hour12: true})
        wave_name.innerText = data.t_name + " Wave " + data.wave_id + " " + day + " " + time
        wave_div.appendChild(wave_name)

        for(const [game, info] of Object.entries(data['events'])){
            game_name = document.createElement("h3")
            game_name.innerText = info.event
            wave_div.appendChild(game_name)

            for(const [player, pool_info] of Object.entries(info.players)){
                console.log( pool_info)
                station = pool_info.display
                phase = pool_info.phase_id
                phaseGroup = pool_info.phasegroup_id
                player_data = document.createElement("p")
                game_link = info.event.replace(/[.#!^]/g, "")
                game_link = game_link.replace(/[:\[\]]/g, "-")
                game_link = game_link.replace(/- /g, "-")
                game_link = game_link.replace(/ /g, "-").toLowerCase()
                //console.log(game_link)
                game_link = game_link.replace(/--/g, "-")
                //console.log(game_link)
                if(game_link.slice(-1).search(/[A-Za-z0-9]/) == -1){
                    game_link = game_link.slice(0, -1)
                    console.log(game_link)
                }
                link = "https://start.gg/" + data.slug +"/event/" + game_link + "/brackets/" + phase + "/" + phaseGroup
                player_data.innerHTML = pool_info.tag + " " + "<a href=" + link + ">" + station + "</a>"
                wave_div.appendChild(player_data)
                if(!(tags.has(pool_info.tag))){
                    new_tag = document.createElement("div")
                    new_tag.className = "playerTag"
                    new_tag.innerText = pool_info.tag
                    tagList.appendChild(new_tag)
                }
                tags.add(pool_info.tag)
            }
        }
        main_div.appendChild(wave_div)
    }

}

function togglePlayerList(){
    btn = document.getElementById('playerCollapseBtn')
    t_btn = document.getElementById('tournamentCollapseBtn')
    playerListElement = document.getElementById("playerList")
    tListElement = document.getElementById("TournamentSelection")
    if(btn.dataset.state == "disabled"){
        playerListElement.style.display = "block"
        btn.dataset.state = "enabled"
        if(t_btn.dataset.state == "enabled"){
            tListElement.style.display = "none"
            t_btn.dataset.state = "disabled"
        }
    }
    else{
        playerListElement.style.display = "none"
        btn.dataset.state = "disabled"
    }
}

function toggleTournamentList(){
    p_btn = document.getElementById('playerCollapseBtn')
    btn = document.getElementById('tournamentCollapseBtn')
    tListElement = document.getElementById("TournamentSelection")
    playerListElement = document.getElementById("playerList")
    if(btn.dataset.state == "disabled"){
        tListElement.style.display = "block"
        btn.dataset.state = "enabled"
        if(p_btn.dataset.state == "enabled"){
            playerListElement.style.display = "none"
            p_btn.dataset.state = "disabled"
        }
    }
    else{
        tListElement.style.display = "none"
        btn.dataset.state = "disabled"
    }
}

async function generateLink(){
    data = {'users' : [...users], 'tournaments' : [...t_list], 'name' : "test"}
    console.log(JSON.stringify(data))
    const response = await fetch(api_url, {
        method: "POST",
        mode : "cors",
        cache : "no-cache",
        headers : {
            "Content-Type" : "application/json",
            "Access-Control-Allow-Origin" : "*"
        },
        body : JSON.stringify(data)
    });
    result = await response.json()
    id = result['newID']
    var url = "https://pooltime.pages.dev/?saved=" + id
    //window.history.pushState({additionalInformation: "Updated to saved link"}, "Schedule app", url)

    linkText = document.getElementById('LinkText')
    linkText.innerText = url

    copyButton = document.getElementById("clipboardButton")
    copyButton.style.display = 'block'

    container = document.getElementById('shareableLinkContainer')
    container.style.display = 'flex'



}

async function copyLink(){
    linkText = document.getElementById('LinkText')
    url = linkText.innerText
    if(url != ''){
        navigator.clipboard.writeText(url)
    }
}