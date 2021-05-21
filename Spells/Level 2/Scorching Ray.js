// Scorching Ray Macro
// based on code from Caewok, Crymic, and Kekilla
// Set item to Other, make sure target information is not set at all
// no damage formula on item
// will pull valid targets in range if no targets are selected
// Dependants: midi-qol, Dice So Nice (not required, but supported)

const actorD = game.actors.get(args[0].actor._id);
const tokenD = canvas.tokens.get(args[0].tokenId);
const itemD = args[0].item;
const itemData = actorD.items.get(itemD.id);
const itemRange = itemD.data.range.value;
const getItem = actorD.items.getName(itemD.name);
const spellLevel = Number(args[0].spellLevel);
const raysToCast = 1 + spellLevel;
const rollProf = args[0].rollData.prof;
const rollAbility = args[0].rollData.attributes.spellcasting;
const rollMod = args[0].rollData.abilities[rollAbility].mod || 0;
const spellCriticalThreshold = actorD.getFlag("dnd5e", "spellCriticalThreshold") || 20;
const withinRangeOfToken = canvas.tokens.placeables.filter(t => t.id !== tokenD.id && t.actor.data.type === "npc" && t.visible && withinRange(token, t, itemRange));
let all_targets = args[0].targets.length > 0 ? args[0].targets : withinRangeOfToken;
let damageCard_Attack = [];
let damageCard_Damage = [];
let damageCard_Hits = [];

console.log(getItem);

async function wait(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

// function from Kekilla
function withinRange(origin, target, range) {
    const ray = new Ray(origin, target);
    let distance = canvas.grid.measureDistances([{ ray }], { gridSpaces: true })[0];
    return range >= distance;
}

async function rollAttack(target, adv, dis) {
    let rollFormula = `1d20`
    if (adv && !dis) {
        rollFormula = `2d20kh`
    } else if (dis && !adv) {
        rollFormula = `2d20kl`
    }
    let attackRoll = await new Roll(`(${rollFormula} + ${rollProf} + ${rollMod})`).roll();
    game.dice3d?.showForRoll(attackRoll);

    let attackRoll_Render = await attackRoll.render();
    let result = attackRoll.dice[0].results[0].discarded ? attackRoll.dice[0].results[1].result : attackRoll.dice[0].results[0].result
    if (result >= spellCriticalThreshold) {
        attackRoll_Render = attackRoll_Render.replace('dice-total', 'dice-total critical');
    }
    else if (result === 1) {
        attackRoll_Render = attackRoll_Render.replace('dice-total', 'dice-total fumble');
    }

    damageCard_Attack.push(attackRoll_Render);

    return(attackRoll);
}

async function dealDamage(target, newCritical) {
    let numDice = newCritical ? `4d6` : `2d6`;
    const damageRoll = new Roll(`${numDice}`).roll();
    game.dice3d?.showForRoll(damageRoll);

    let damageRoll_Render = await damageRoll.render();
    damageCard_Damage.push(damageRoll_Render);
/*
    if (args[0].targets.length === 0) {
        let targetD = canvas.tokens.get(target.id);
        targetD.setTarget(true, { user: game.user, releaseOthers: true, groupSelection: false });
        await wait(1000);
        console.log(tokenD);
        console.log(targetD);
        console.log(game.user.targets);
        AutoAnimations.playAnimation(tokenD, targetD, getItem);
        targetD.setTarget(false, { user: game.user, releaseOthers: true, groupSelection: false });
    }
*/
    return (damageRoll);
}

// roll combine function from Kekilla
function combineRolls(arr) {
    return arr.reduce((acc, val, ind) => {
        if (ind === 0) {
            return val;
        } else {
            let returnVal = new Roll(`${acc._formula} + ${val._formula}`);

            returnVal.data = {};
            returnVal.results = [...acc.results, `+`, ...val.results];
            returnVal.terms = [...acc.terms, `+`, ...val.terms];
            returnVal._rolled = true;
            returnVal._total = acc._total + val._total;

            return returnVal;
        }
    });
}

async function updateChatCard() {
    await wait(500);

    let chatMessage = await game.messages.get(args[0].itemCardId);
    let content = await duplicate(chatMessage.data.content);
    let number = 0

    const flexRow_search = /<div class="card-buttons">[\s\S]*<div class="midi-qol-bonus-roll">/g;
    const flexRow_replace = `<div class="card-buttons"><div class="flexrow 2"><div class="midi-qol-attack-roll"><div class="end-midi-qol-attack-roll"></div></div><div class="midi-qol-damage-roll"><div class="end-midi-qol-damage-roll"></div></div></div><div class="flexrow 1"><div class="midi-qol-bonus-roll">`;
    content = await content.replace(flexRow_search, flexRow_replace);

    let attack_list = damageCard_Attack.join('<div style="text-align:center">Ray #</div>');
    const attack_list_search = /<div class="midi-qol-attack-roll">[\s\S]*<div class="end-midi-qol-attack-roll">/g;
    const attack_list_replace = `<div class="midi-qol-attack-roll"><div style="text-align:center">Ray #</div>${attack_list}<div class="end-midi-qol-attack-roll">`;
    content = await content.replace(attack_list_search, attack_list_replace);
    number = 0
    content = await content.replace(/#/g, function () { return ++number; });

    let damage_list = damageCard_Damage.join('<div style="text-align:center">(Fire)</div>');
    const damage_list_search = /<div class="midi-qol-damage-roll">[\s\S]*<div class="end-midi-qol-damage-roll">/g;
    const damage_list_replace = `<div class="midi-qol-damage-roll"><div style="text-align:center">(Fire)</div>${damage_list}<div class="end-midi-qol-damage-roll">`;
    content = await content.replace(damage_list_search, damage_list_replace);

    let hits_list = damageCard_Hits.join('');
    let hits_result = `<div><div class="midi-qol-nobox">${hits_list}</div></div>`;
    const hits_list_search = /<div class="midi-qol-hits-display">[\s\S]*<div class="end-midi-qol-hits-display">/g;
    const hits_list_replace = `<div class="midi-qol-hits-display"><div class="end-midi-qol-hits-display">${hits_result}`;
    content = await content.replace(hits_list_search, hits_list_replace);
    number = 0
    content = await content.replace(/#/g, function () { return ++number; });

    await chatMessage.update({ content: content });
}

let rayList = "";
let dropdownList = "";

for (let target of all_targets) {
    let id = target.id || target._id;
    dropdownList += `<option value="${id}">${target.name}</option>`;
}
for (let i = 1; i <= raysToCast; i++) {
    rayList += `<tr>
                    <td><label>Scorching Ray ${i}</label></td>
                    <td><select name="rayTargets" id="target">
                        ${dropdownList}
                    </select></td>
                    <td><input type="checkbox" id="advantage" name="advantage"></td>
                    <td><input type="checkbox" id="disadvantage" name="disadvantage"></td>
                </tr>`
}

let new_content = ` <p>You have currently <b>${raysToCast}</b> total Scorching Rays.</p>
                    <form class="flexcol">
                        <table width="100%">
                            <tbody>
                                <tr>
                                    <th>Number Rays</th>
                                    <th>Target</th>
                                    <th>ADV</th>
                                    <th>DIS</th>
                                </tr>
                                <tr>
                                    <td><b>Set All</b></td>
                                    <td><select name="allTargets" id="Targ-All">${dropdownList}</select></td>
                                    <td><input type="checkbox" id="ADV-All"></td>
                                    <td><input type="checkbox" id="DIS-All"></td>
                                </tr>
                                ${rayList}
                            </tbody>
                        </table>
                    </form>
                    <script type = "text/javascript">
                        document.getElementById('Targ-All').onchange = function () {
                            let dropdowns = document.getElementsByName('rayTargets');
                            for (let dropdown of dropdowns) {
                                dropdown.value = this.value;
                            }
                        }
                        document.getElementById('ADV-All').onclick = function () {
                            let checkboxes = document.getElementsByName('advantage');
                            for (let checkbox of checkboxes) {
                                checkbox.checked = this.checked;
                            }
                        }
                        document.getElementById('DIS-All').onclick = function () {
                            let checkboxes = document.getElementsByName('disadvantage');
                            for (let checkbox of checkboxes) {
                                checkbox.checked = this.checked;
                            }
                        }
                    </script>`
new Dialog({
    title: "Scorching Ray Damage",
    content: new_content,
    buttons: {
        one: {
            label: "Damage", callback: async (html) => {
                let rayCount = 0
                let selected_targets = html.find('select#target');
                let selected_adv = html.find('input#advantage');
                let selected_dis = html.find('input#disadvantage');

                let target_details = {};

                for (let i = 0; i < selected_targets.length; i++) {
                    let selected_target = selected_targets[i]
                    let adv = selected_adv[i].checked;
                    let dis = selected_dis[i].checked;
                    let target_data = { ray: i, adv: adv, dis: dis, id: selected_target.value }
                    if (target_details[selected_target.value]) {
                        target_details[selected_target.value].push(target_data);
                    } else {
                        target_details[selected_target.value] = [];
                        target_details[selected_target.value].push(target_data);
                    }
                }

                for (let target_detail in target_details) {
                    let ray_details = target_details[target_detail]
                    let damageRolls = [];
                    let target = await canvas.tokens.get(target_detail);
                    let raysThatHit = [];
                    for (let ray_detail of ray_details) {
                        let attackRoll = await rollAttack(target, ray_detail.adv, ray_detail.dis);
                        let result = attackRoll.dice[0].results[0].discarded ? attackRoll.dice[0].results[1].result : attackRoll.dice[0].results[0].result
                        if ((attackRoll.total >= target.actor.data.data.attributes.ac.value && result > 1) || result >= spellCriticalThreshold) {
                            raysThatHit.push(rayCount + 1);
                            const newCritical = result >= spellCriticalThreshold ? true : false;
                            let damageRoll = await dealDamage(target, newCritical);
                            damageRolls.push(damageRoll);
                        } else {
                            damageCard_Damage.push(`<div class="dice-roll"><div class="dice-result"><div class="dice-formula">0</div><h4 class="dice-total">Missed</h4></div></div>`);
                        }
                        ++rayCount
                    }

                    let damageRollAll;

                    if (damageRolls.length > 0) {
                        if (damageRolls.length === 1) {
                            damageRollAll = damageRolls[0];
                            damageCard_Hits.push(`<div class="midi-qol-flex-container">
                                <div class="midi-qol-target-npc midi-qol-target-name" id="${target.id}">
                                    <img src="${target.data.img}" width="30" height="30" style="border:0px">
                                </div>
                                <div> takes ${damageRollAll.total} fire damage from <div style="font-size: x-small">(Ray ${raysThatHit[0]})</div></div>
                            </div>`);
                        } else {
                            damageRollAll = combineRolls(damageRolls);
                            let rayText = raysThatHit.join(', ');
                            rayText = rayText.replace(/,([^,]*)$/, ' & $1');
                            damageCard_Hits.push(`<div class="midi-qol-flex-container">
                                <div class="midi-qol-target-npc midi-qol-target-name" id="${target.id}">
                                    <img src="${target.data.img}" width="30" height="30" style="border:0px">
                                </div>
                                <div> takes ${damageRollAll.total} fire damage from <div style="font-size: x-small">(Rays ${rayText})</div></div>
                            </div>`);
                        }

                        new MidiQOL.DamageOnlyWorkflow(
                            actorD,
                            tokenD,
                            damageRollAll.total,
                            "fire",
                            [target],
                            damageRollAll,
                            {
                                itemCardId: args[0].itemCardId,
                                useOther: false,
                            }
                        );
                    }
                }
                updateChatCard();
            }
        }
    }
}).render(true);