// Eldritch Blast Macro
// based on code from Caewok, Crymic, and Kekilla
// Set item to Other, make sure target limit is not set
// no damage formula on item
// Dependants: midi-qol, Dice So Nice (not required, but supported)

const actorD = game.actors.get(args[0].actor._id);
const tokenD = canvas.tokens.get(args[0].tokenId);
const itemD = args[0].item;
const getItem = actorD.items.getName(itemD.name);
const blastsToCast = Math.min(1 + Math.floor((actorD.data.data.details.level + 1) / 6), 4);
const rollProf = args[0].rollData.prof;
const rollAbility = args[0].rollData.attributes.spellcasting;
const rollMod = args[0].rollData.abilities[rollAbility].mod || 0;
const spellCriticalThreshold = actorD.getFlag("dnd5e", "spellCriticalThreshold") || 20;
let damageCard_Attack = [];
let damageCard_Damage = [];
let damageCard_Hits = [];
let damageType = ["force", "Force"];

async function wait(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
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
    let numDice = newCritical ? `2d10` : `1d10`;
    const damageRoll = new Roll(`${numDice}`).roll();
    game.dice3d?.showForRoll(damageRoll);

    let damageRoll_Render = await damageRoll.render();
    damageCard_Damage.push(damageRoll_Render);

    //AutoAnimations.playAnimation(tokenD, target, itemD);

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

    let attack_list = damageCard_Attack.join('<div style="text-align:center">Blast #</div>');
    const attack_list_search = /<div class="midi-qol-attack-roll">[\s\S]*<div class="end-midi-qol-attack-roll">/g;
    const attack_list_replace = `<div class="midi-qol-attack-roll"><div style="text-align:center">Blast #</div>${attack_list}<div class="end-midi-qol-attack-roll">`;
    content = await content.replace(attack_list_search, attack_list_replace);
    number = 0
    content = await content.replace(/#/g, function () { return ++number; });

    let damage_list = damageCard_Damage.join(`<div style="text-align:center">(${damageType[1]})</div>`);
    const damage_list_search = /<div class="midi-qol-damage-roll">[\s\S]*<div class="end-midi-qol-damage-roll">/g;
    const damage_list_replace = `<div class="midi-qol-damage-roll"><div style="text-align:center">(${damageType[1]})</div>${damage_list}<div class="end-midi-qol-damage-roll">`;
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

let blastList = "";
let dropdownList = "";
let all_targets = args[0].targets;

for (let target of all_targets) {
    dropdownList += `<option value="${target._id}">${target.name}</option>`;
}

for (let i = 1; i <= blastsToCast; i++) {
    blastList += `<tr>
                    <td><label>Eldritch Blast ${i}</label></td>
                    <td><select name="blastTargets" id="target">
                        ${dropdownList}
                    </select></td>
                    <td><input type="checkbox" id="advantage"></td>
                    <td><input type="checkbox" id="disadvantage"></td>
                </tr>`
}

let the_content = `<p>You have currently <b>${blastsToCast}</b> total Eldritch Blasts.</p><form class="flexcol"><table width="100%"><tbody><tr><th>Number Blasts</th><th>Target</th><th>ADV</th><th>DIS</th></tr>${blastList}</tbody></table></form>`
new Dialog({
    title: "Eldritch Blast Damage",
    content: the_content,
    buttons: {
        one: {
            label: "Damage", callback: async (html) => {
                let blastCount = 0;
                let selected_targets = html.find('select#target');
                let selected_adv = html.find('input#advantage');
                let selected_dis = html.find('input#disadvantage');

                let target_details = {};

                for (let i = 0; i < selected_targets.length; i++) {
                    let selected_target = selected_targets[i]
                    let adv = selected_adv[i].checked;
                    let dis = selected_dis[i].checked;
                    let target_data = { blast: i, adv: adv, dis: dis, id: selected_target.value }
                    if (target_details[selected_target.value]) {
                        target_details[selected_target.value].push(target_data);
                    } else {
                        target_details[selected_target.value] = [];
                        target_details[selected_target.value].push(target_data);
                    }
                }

                for (let target_detail in target_details) {
                    let blast_details = target_details[target_detail]
                    let damageRolls = [];
                    let target = await canvas.tokens.get(target_detail);
                    let blastsThatHit = [];
                    for (let blast_detail of blast_details) {
                        let attackRoll = await rollAttack(target, blast_detail.adv, blast_detail.dis);
                        let result = attackRoll.dice[0].results[0].discarded ? attackRoll.dice[0].results[1].result : attackRoll.dice[0].results[0].result
                        if ((attackRoll.total >= target.actor.data.data.attributes.ac.value && result > 1) || result >= spellCriticalThreshold) {
                            blastsThatHit.push(blastCount + 1);
                            const newCritical = result >= spellCriticalThreshold ? true : false;
                            let damageRoll = await dealDamage(target, newCritical);
                            damageRolls.push(damageRoll);
                        } else {
                            damageCard_Damage.push(`<div class="dice-roll"><div class="dice-result"><div class="dice-formula">0</div><h4 class="dice-total">Missed</h4></div></div>`);
                        }
                        ++blastCount
                    }

                    let damageRollAll;

                    if (damageRolls.length > 0) {
                        if (damageRolls.length === 1) {
                            damageRollAll = damageRolls[0];
                            damageCard_Hits.push(`<div class="midi-qol-flex-container">
                                <div class="midi-qol-target-npc midi-qol-target-name" id="${target.id}">
                                    <img src="${target.data.img}" width="30" height="30" style="border:0px">
                                </div>
                                <div> takes ${damageRollAll.total} ${damageType[0]} damage from <div style="font-size: x-small">(Blast ${blastsThatHit[0]})</div></div>
                            </div>`);
                        } else {
                            damageRollAll = combineRolls(damageRolls);
                            let blastText = blastsThatHit.join(', ');
                            blastText = blastText.replace(/,([^,]*)$/, ' & $1');
                            damageCard_Hits.push(`<div class="midi-qol-flex-container">
                                <div class="midi-qol-target-npc midi-qol-target-name" id="${target.id}">
                                    <img src="${target.data.img}" width="30" height="30" style="border:0px">
                                </div>
                                <div> takes ${damageRollAll.total} ${damageType[0]} damage from <div style="font-size: x-small">(Blast ${blastText})</div></div>
                            </div>`);
                        }

                        new MidiQOL.DamageOnlyWorkflow(
                            actorD,
                            tokenD,
                            damageRollAll.total,
                            damageType[0],
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