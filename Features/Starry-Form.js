// Starry form Item Macro for Circle of Moon Druids
// Will change token image, reset HP, and add resistences ( at level 14 )
// The macro will update resources itself, do not set the item to update resources.

// likely considered RAI, as the rules are not clear if starry form should have a seperate health pool
// first cast will transform to Starry Form, second cast will revert to normal
// when reverting to normal, HP will be reset to what it was before transforming


let tokenC = canvas.tokens.get(args[0].tokenId);
let actorC = game.actors.get(args[0].actor._id);

let starry = actorC.getFlag("world", "Starry-Form") || false;
let normalHP = actorC.getFlag("world", "Starry-normalHP") || actorC.data.data.attributes.hp.value;
let normalResist = actorC.getFlag("world", "Starry-normalResist") || actorC.data.data.traits.dr.value;
let druidLevel = actorC.items.getName("Druid").data.data.levels;
const chatMessage = await game.messages.get(args[0].itemCardId);
let content = await duplicate(chatMessage.data.content);
let searchString, replaceString;

if(starry === true){
    searchString = `<div class="card-content">`;
    replaceString = `<div class="card-content"><p>Switching to Normal Form</p>`;
    await tokenC.update({img: "https://assets.forge-vtt.com/605f5fbf346d9b7c4395000b/uploads/avatars/character/Maris-Token.png"});
    await actorC.setFlag("world", "Starry-Form", false);
    await actorC.update({"data.attributes.hp.value": normalHP});
    if(druidLevel >= 14){
        await actorC.update({"data.traits.dr.value": normalResist});
    }
} else if (starry === false && actorC.data.data.resources.primary.value > 0) {
    searchString = `<div class="card-content">`;
    replaceString = `<div class="card-content"><p>Switching to Starry Form.</p><p>${(actorC.data.data.resources.primary.value -1)} Wild Shape Charges remaining.</p>`;
    await tokenC.update({img: "https://assets.forge-vtt.com/605f5fbf346d9b7c4395000b/uploads/avatars/character/Maris-Starry-Token.webp"});
    await actorC.setFlag("world", "Starry-Form", true);
    await actorC.setFlag("world", "Starry-normalHP", actorC.data.data.attributes.hp.value);
    await actorC.setFlag("world", "Starry-normalResist", normalResist);
    await actorC.update({"data.attributes.hp.value": actorC.data.data.attributes.hp.max, "data.resources.primary.value": (actorC.data.data.resources.primary.value - 1)});
    if(druidLevel >= 14){
        let starryResist = normalResist;
        starryResist.push("bludgeoning");
        starryResist.push("piercing");
        starryResist.push("slashing");
        await actorC.update({"data.traits.dr.value": starryResist});
    }
} else if (actorC.data.data.resources.primary.value < 1) {
    searchString = `<div class="card-content">`;
    replaceString = `<div class="card-content"><p>Starry Form Failed!</p><p>No Wild Shape Charges available.</p>`;
}

content = await content.replace(searchString, replaceString);
await chatMessage.update({ content: content });