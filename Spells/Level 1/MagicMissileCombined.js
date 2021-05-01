// Item macro, Midi-qol On Use. This handles damage, so remove it from the spell card.
// Based on macros from Crymic and Caewok
// https://gitlab.com/crymic/foundry-vtt-macros/-/blob/master/5e/Spells/Level%201/Magic%20Missile.js
// https://github.com/caewok/Foundry-Macros/blob/main/spells/Level%201/Magic%20Missile/RandomMagicMissileAnimation.js
// This version rolls damage for each missile.

(async()=>{
    async function wait(ms) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
    }

    function isEmpty(str) {
        const is_empty = (!str || /^\s*$/.test(str));
        //console.log("isEmpty? " + is_empty);
        return is_empty;
    }

    async function MagicMissilesAnimation(args1, args2, args3) {
        console.log("JB2A RandomMagicMissile|args", args1, args2, args3);

        const the_caster = canvas.tokens.get(args1);
        const the_target = canvas.tokens.get(args2);
        const color = args3 ?? "Blue";

        if (!canvas.fxmaster) ui.notifications.error("This macro depends on the FXMaster module. Make sure it is installed and enabled");

        const file = "modules/jb2a_patreon/Library/1st_Level/Magic_Missile/";
        const mmA = `${file}MagicMissile_01_${color}_30ft_01_1600x400.webm`;
        const mmB = `${file}MagicMissile_01_${color}_30ft_02_1600x400.webm`;
        const mmC = `${file}MagicMissile_01_${color}_30ft_03_1600x400.webm`;
        const mmD = `${file}MagicMissile_01_${color}_30ft_04_1600x400.webm`;
        const mmE = `${file}MagicMissile_01_${color}_30ft_05_1600x400.webm`;
        const mmF = `${file}MagicMissile_01_${color}_30ft_06_1600x400.webm`;
        const mmG = `${file}MagicMissile_01_${color}_30ft_07_1600x400.webm`;
        const mmH = `${file}MagicMissile_01_${color}_30ft_08_1600x400.webm`;
        const mmI = `${file}MagicMissile_01_${color}_30ft_09_1600x400.webm`;

        const mmAA = `${file}MagicMissile_01_${color}_60ft_01_2800x400.webm`;
        const mmBB = `${file}MagicMissile_01_${color}_60ft_02_2800x400.webm`;
        const mmCC = `${file}MagicMissile_01_${color}_60ft_03_2800x400.webm`;
        const mmDD = `${file}MagicMissile_01_${color}_60ft_04_2800x400.webm`;
        const mmEE = `${file}MagicMissile_01_${color}_60ft_05_2800x400.webm`;
        const mmFF = `${file}MagicMissile_01_${color}_60ft_06_2800x400.webm`;
        const mmGG = `${file}MagicMissile_01_${color}_60ft_07_2800x400.webm`;
        const mmHH = `${file}MagicMissile_01_${color}_60ft_08_2800x400.webm`;
        const mmII = `${file}MagicMissile_01_${color}_60ft_09_2800x400.webm`;

        function random_item(items) {
        return(items[Math.floor(Math.random()*items.length)]);
        }

        const itemsA = [mmA, mmB, mmC, mmD, mmE, mmF, mmG, mmH, mmI];
        const itemsB = [mmAA, mmBB, mmCC, mmDD, mmEE, mmFF, mmGG, mmHH, mmII];
        const sleepNow = (delay) => new Promise((resolve) => setTimeout(resolve, delay))

        async function Cast() {
            let ray = new Ray(the_caster.center, the_target.center);
            let anDeg = -(ray.angle * 57.3);
            let anDist = ray.distance;

        // not using these; just placeholders
            let anFile = random_item(itemsA);
            let anFileSize = 600;
            let anchorX = 0.125;
            
            // set based on distance
            switch(true){
            case (anDist<=1800):
                    anFileSize = 1200;
                    anFile = random_item(itemsA);
                    anchorX = 0.125;
                    break;
            default:
                    anFileSize = 2400;
                    anFile = random_item(itemsB);
                    anchorX = 0.071;
                    break;
            }

            let anScale = anDist / anFileSize;
            let anScaleY = anScale;
            if (anDist<=600){anScaleY = 0.6}
            if (anDist>=700 && anDist <=1200){anScaleY = 0.8}
            if (anDist>=1300 && anDist <=1800){anScaleY = 0.6}
            if (anDist>=1900){anScaleY = anScale}

            let spellAnim = 
            {
                file: anFile,
                position: the_caster.center,
                anchor: {
                    x: anchorX,
                    y: 0.5
                },
                angle: anDeg,
                scale: {
                    x: anScale,
                    y: anScaleY
                }
            }; 

            canvas.fxmaster.playVideo(spellAnim);
            await sleepNow(80);
            game.socket.emit('module.fxmaster', spellAnim);
            await sleepNow(50);
        }

        Cast ()
    }

    const COLOR = "Blue";
        
    const actorD = game.actors.get(args[0].actor._id);
    const tokenD = canvas.tokens.get(args[0].tokenId);
    let level = 2 + Number(args[0].spellLevel);
    if (args[0].targets.length === 1){
        let target = canvas.tokens.get(args[0].targets[0]._id);
        let damageRoll = new Roll(`(${level}d4 +${level})`).roll();
        game.dice3d?.showForRoll(damageRoll);
        new MidiQOL.DamageOnlyWorkflow(actorD, tokenD, damageRoll.total, "force", [target], damageRoll, {itemCardId: args[0].itemCardId});
        let damage_target = `<div class="midi-qol-flex-container"><div>hits</div><div class="midi-qol-target-npc midi-qol-target-name" id="${target.id}"> ${target.name}</div><div><img src="${target.data.img}" width="30" height="30" style="border:0px"></div></div>`;
        await wait(1000);

        let damage_results = `<div><div class="midi-qol-nobox">${damage_target}</div></div>`;

        const chatMessage = await game.messages.get(args[0].itemCardId);
        let content = await duplicate(chatMessage.data.content);

        const searchString =  /<div class="midi-qol-hits-display">[\s\S]*<div class="end-midi-qol-hits-display">/g;
        const replaceString = `<div class="midi-qol-hits-display"><div class="end-midi-qol-hits-display">${damage_results}`;

        content = await content.replace(searchString, replaceString);
        await chatMessage.update({ content: content });
        
        for(let i = 0; i < level; i++) {
            await MagicMissilesAnimation(args[0].actor._id, args[0].targets[0]._id, COLOR);
        }
    }
    if (args[0].targets.length > 1){
        let targetList = "";
        let all_targets = args[0].targets;

        for (let target of all_targets) {
            targetList += `<tr><td>${target.name}</td><td><input type="number" id="target" min="0" max="${level}" name="${target._id}"></td></tr>`;
        }
        let the_content = `<p>You have currently <b>${level}</b> total Magic Missle bolts.</p><form class="flexcol"><table width="100%"><tbody><tr><th>Target</th><th>Number Bolts</th></tr>${targetList}</tbody></table></form>`;
        new Dialog({
            title: "Magic Missle Damage",
            content: the_content,
            buttons: {
                one: {
                    label: "Damage", callback: async (html) => {
                        let spentTotal = 0;
                        let selected_targets = html.find('input#target');
                        for(let get_total of selected_targets){
                            spentTotal += Number(get_total.value);
                        }
                        if (spentTotal > level) return ui.notifications.error(`The spell fails, You assigned more bolts then you have.`);
                        let damage_target = [];
                        let allDamageRolls = [];

                        for (let selected_target of selected_targets) {
                            let damageNum = selected_target.value;
                            if (!isEmpty(damageNum)) {
                                let damageRoll = new Roll(`${damageNum}d4 +${damageNum}`).roll();
                                game.dice3d?.showForRoll(damageRoll);

                                let target_id = selected_target.name;
                                let get_target = canvas.tokens.get(target_id);

                                new MidiQOL.DamageOnlyWorkflow(actorD, tokenD, damageRoll.total, "force", [get_target], damageRoll, { itemCardId: args[0].itemCardId });

                                let damageRoll_Render = await damageRoll.render();
                                allDamageRolls.push(damageRoll_Render);

                                damage_target.push(`<div class="midi-qol-flex-container"><div>hits</div><div class="midi-qol-target-npc midi-qol-target-name" id="${get_target.id}"> ${get_target.name}</div><div><img src="${get_target.data.img}" width="30" height="30" style="border:0px"></div><div> for ${damageRoll.total} damage</div></div>`);

                                for(let i = 0; i < damageNum; i++) {
									await MagicMissilesAnimation(args[0].tokenId, target_id, COLOR);
								}
                            }
                        }
                        let damage_list = damage_target.join('');
                        await wait(1000);
                        let damage_results = `<div><div class="midi-qol-nobox">${damage_list}</div></div>`;
                        let chatMessage = await game.messages.get(args[0].itemCardId);
                        let content = await duplicate(chatMessage.data.content);
                        const searchString =  /<div class="midi-qol-hits-display">[\s\S]*<div class="end-midi-qol-hits-display">/g;
                        const replaceString = `<div class="midi-qol-hits-display"><div class="end-midi-qol-hits-display">${damage_results}`;
                        content = await content.replace(searchString, replaceString);

                        let damage_rolls = allDamageRolls.join('<div style="text-align:center">(Force)</div>');
                        const rollSearchString = /<div class="midi-qol-other-roll">[\s\S]*<div class="end-midi-qol-other-roll">/g;
                        const rollReplaceString = `<div class="midi-qol-other-roll"><div style="text-align:center">(Force)</div>${damage_rolls}<div class="end-midi-qol-other-roll">`;
                        content = await content.replace(rollSearchString, rollReplaceString);

                        await chatMessage.update({ content: content });
                    }
                }
            }
        }).render(true);
    }
})();
