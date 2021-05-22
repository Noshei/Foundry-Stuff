// Wild Magic Surge Spells
// Manually called macro
// Requires Wild Magic Surge Spells actor with all of the spells, should be configured with same stats as the sorcerer
// https://github.com/Noshei/Foundry-Stuff/blob/main/Features/Wild_Magic_Surge_Spells-Actor.json

let actorD = game.actors.find(i => i.name === `Wild Magic Surge Spells`);
let spells = actorD.items.filter(i => i.type === "spell");
let config = {
    buttonIDs : [],
    windowID : ``,
}

async function wait(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

main();

async function main() {

    let content = getContent();

    let dialogWindow = new Dialog({
        title: "Wild Magic Surge Spells",
        content: content,
        buttons: {
            close: {
                icon: "<i class='fas fa-tick'></i>",
                label: `Close`
            }
        },
        default: "close",
        close: () => { }
    },
        {
            width: 600,
        });

    dialogWindow.render(true);
    config.windowID = dialogWindow.appId;
    await wait(500);
    createListeners();

    function getContent() {
        return `
        <p>Wild Magic Surge Spells.  Cast the spell from the roll result in chat.</p>
        <form class="flexcol">
            <table width="100%">
                <tbody>
                    <tr>
                        <th></th>
                        <th>Spell</th>
                        <th>Description</th>
                        <th>Cast</th>
                    </tr>
                    ${getSpells()}
                </tbody>
            </table>
        </form>`;
        function getSpells() {
            let spellList = "";
            for (let spell of spells) {
                spellList += `
                <tr>
                    <td><img src="${spell.data.img}" width="30" height="30" /></td>
                    <td><b>${spell.data.name}</b></td>
                    <td>${spell.data.data.description.value}</td>
                    <td><button type="button" id="${spell.id}">Cast ${spell.data.name}</button></td>
                </tr>`
                config.buttonIDs.push(spell.id);
            }
            return spellList;
        }
    }

    function createListeners() {
        config.buttonIDs.forEach(id => {
            document.getElementById(`${id}`).onclick = function () {
                let spell = spells.find(i => i.id === id);
                spell.roll();
                dialogWindow.close();
            }
        });
    }
}