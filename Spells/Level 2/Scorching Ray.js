// Scorching Ray Macro
// based on code from Caewok, Crymic, and Kekilla
// Set item to Other, make sure target limit is not set
// no damage formula on item


const actorD = game.actors.get(args[0].actor._id);
const tokenD = canvas.tokens.get(args[0].tokenId);
const itemD = args[0].item;
const getItem = actorD.items.getName(itemD.name);
const spellLevel = Number(args[0].spellLevel);
const raysToCast = 1 + spellLevel;
const rollProf = args[0].rollData.prof;
const rollAbility = args[0].rollData.attributes.spellcasting;
const rollMod = args[0].rollData.abilities[rollAbility].mod || 0;
let damageCard_Attack = [];
let damageCard_Damage = [];
let damageCard_Hits = [];

async function wait(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

async function rollAttack(target) {
    let attackRoll = await new Roll(`(1d20 + ${rollProf} + ${rollMod})`).roll();

    let attackRoll_Render = await attackRoll.render();
    if (attackRoll.dice[0].results[0].result === 20) {
        attackRoll_Render = attackRoll_Render.replace('dice-total', 'dice-total critical');
    }
    else if (attackRoll.dice[0].results[0].result === 1) {
        attackRoll_Render = attackRoll_Render.replace('dice-total', 'dice-total fumble');
    }

    damageCard_Attack.push(attackRoll_Render);

    return(attackRoll);
}

async function dealDamage(target, newCritical) {
    let numDice = newCritical ? `4d6` : `2d6`;
    const damageRoll = new Roll(`${numDice}`).roll();

    let damageRoll_Render = await damageRoll.render();
    damageCard_Damage.push(damageRoll_Render);


    return (damageRoll);

    //AutoAnimations.playAnimation(tokenD, target, itemD);
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

if (args[0].targets.length === 1) {
    let damageRolls = [];
    let target = await canvas.tokens.get(args[0].targets[0]._id);
    let raysThatHit = [];
    for (let i = 0; i < raysToCast; i++) {
        let attackRoll = await rollAttack(target);
        if (attackRoll.total >= target.actor.data.data.attributes.ac.value) {
            raysThatHit.push(i+1);
            const newCritical = attackRoll.dice[0].results[0].result === 20 ? true : false;
            let damageRoll = await dealDamage(target, newCritical);
            damageRolls.push(damageRoll);
        } else {
            damageCard_Damage.push(`<div class="dice-roll"><div class="dice-result"><div class="dice-formula">0</div><h4 class="dice-total">Missed</h4></div></div>`);
        }
    }

    let damageRollAll;
    if (damageRolls.length > 0) {
        if (damageRolls.length === 1) {
            damageRollAll = damageRolls[0];
            damageCard_Hits.push(`<div class="midi-qol-flex-container">
                <div>Ray ${raysThatHit[0]} hits</div>
                <div class="midi-qol-target-npc midi-qol-target-name" id="${target.id}"> ${target.name}</div>
                <div><img src="${target.data.img}" width="30" height="30" style="border:0px"></div>
                <div> for ${damageRollAll.total} damage</div>
            </div>`);
        } else {
            damageRollAll = combineRolls(damageRolls);
            let rayText = raysThatHit.join(', ');
            rayText = rayText.replace(/,([^,]*)$/, ' and $1');
            damageCard_Hits.push(`<div class="midi-qol-flex-container">
                <div>Rays ${rayText} hits</div>
                <div class="midi-qol-target-npc midi-qol-target-name" id="${target.id}"> ${target.name}</div>
                <div><img src="${target.data.img}" width="30" height="30" style="border:0px"></div>
                <div> for ${damageRollAll.total} damage</div>
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

    updateChatCard();

} else if (args[0].targets.length > 1) {
    let targetList = "";
    let all_targets = args[0].targets;

    for (let target of all_targets) {
        targetList += `<tr><td>${target.name}</td><td><input type="number" id="target" min="0" max="${raysToCast}" name="${target._id}"></td></tr>`;
    }

    let the_content = `<p>You have currently <b>${raysToCast}</b> total Scorching Rays.</p><form class="flexcol"><table width="100%"><tbody><tr><th>Target</th><th>Number Rays</th></tr>${targetList}</tbody></table></form>`;
    new Dialog({
        title: "Scorching Ray Damage",
        content: the_content,
        buttons: {
            one: {
                label: "Damage", callback: async (html) => {
                    let spentTotal = 0;
                    let selected_targets = html.find('input#target');
                    for (let get_total of selected_targets) {
                        spentTotal += Number(get_total.value);
                    }
                    if (spentTotal > raysToCast) return ui.notifications.error(`The spell fails, You assigned more bolts then you have.`);
                    
                    let raysRemaining = raysToCast;

                    for (let selected_target of selected_targets) {
                        let damageRolls = [];
                        let target = await canvas.tokens.get(selected_target.name);
                        let raysThatHit = [];
                        for (let i = 0; i < selected_target.value; i++) {
                            --raysRemaining;
                            let attackRoll = await rollAttack(target);
                            if (attackRoll.total >= target.actor.data.data.attributes.ac.value) {
                                raysThatHit.push(raysToCast - raysRemaining);
                                const newCritical = attackRoll.dice[0].results[0].result === 20 ? true : false;
                                let damageRoll = await dealDamage(target, newCritical);
                                damageRolls.push(damageRoll);
                            } else {
                                damageCard_Damage.push(`<div class="dice-roll"><div class="dice-result"><div class="dice-formula">0</div><h4 class="dice-total">Missed</h4></div></div>`);
                            }
                        }

                        let damageRollAll;

                        if (damageRolls.length > 0) {
                            if (damageRolls.length === 1) {
                                damageRollAll = damageRolls[0];
                                damageCard_Hits.push(`<div class="midi-qol-flex-container">
                                    <div>Ray ${raysThatHit[0]} hits</div>
                                    <div class="midi-qol-target-npc midi-qol-target-name" id="${target.id}"> ${target.name}</div>
                                    <div><img src="${target.data.img}" width="30" height="30" style="border:0px"></div>
                                    <div> for ${damageRollAll.total} damage</div>
                                </div>`);
                            } else {
                                damageRollAll = combineRolls(damageRolls);
                                let rayText = raysThatHit.join(', ');
                                rayText = rayText.replace(/,([^,]*)$/, ' and $1');
                                damageCard_Hits.push(`<div class="midi-qol-flex-container">
                                    <div>Rays ${rayText} hits</div>
                                    <div class="midi-qol-target-npc midi-qol-target-name" id="${target.id}"> ${target.name}</div>
                                    <div><img src="${target.data.img}" width="30" height="30" style="border:0px"></div>
                                    <div> for ${damageRollAll.total} damage</div>
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
}