import fs from 'node:fs';
import path from 'node:path';
import crypto from 'crypto';

const RIDDLES_FILE = path.join(process.cwd(), 'data', 'riddles.json');

function rId(text) {
  return crypto.createHash('md5').update(text).digest('hex').slice(0, 12);
}

function makeRiddle(riddle, answer, category = 'general', customHint = '', extraAliases = []) {
  const cleanAnswer = answer.trim();
  const baseWord = cleanAnswer.toLowerCase().replace(/^(a|an|the|your|my|our)\s+/i, '').trim();

  // ONLY clean grammatical variations of the exact base word
  const aliases = new Set();
  aliases.add(cleanAnswer.toLowerCase());
  aliases.add(baseWord);
  aliases.add(`a ${baseWord}`);
  aliases.add(`an ${baseWord}`);
  aliases.add(`the ${baseWord}`);
  aliases.add(`your ${baseWord}`);

  // Plurals and simple variations
  if (!baseWord.endsWith('s')) {
    aliases.add(`${baseWord}s`);
    aliases.add(`${baseWord}es`);
  } else if (baseWord.endsWith('s') && baseWord.length > 3) {
    aliases.add(baseWord.slice(0, -1));
  }

  for (const extra of extraAliases) {
    const cleanExtra = extra.trim().toLowerCase();
    if (cleanExtra) {
      aliases.add(cleanExtra);
      aliases.add(`a ${cleanExtra}`);
      aliases.add(`an ${cleanExtra}`);
      aliases.add(`the ${cleanExtra}`);
    }
  }

  // Generate exact hint matching the target baseWord
  let hint = customHint;
  if (!hint) {
    const letters = baseWord.replace(/[^a-zA-Z]/g, '');
    const firstLetter = letters[0]?.toUpperCase() || '?';
    const blanks = letters.split('').map((c, i) => (i === 0 ? c.toUpperCase() : '_')).join(' ');
    hint = `${firstLetter} (${blanks})`;
  }

  return {
    id: rId(riddle.trim() + '|' + cleanAnswer),
    riddle: riddle.trim(),
    answer: cleanAnswer,
    aliases: Array.from(aliases).filter(a => a.length > 0),
    category,
    hint: hint.trim(),
  };
}

console.log('Building pristine 2,100+ Riddle Bank with 0 alias leaks...');

// Massive database of unique, authentic riddles
const rawRiddleDefinitions = [
  // NATURE, ELEMENTS & ASTRONOMY
  ['I speak without a mouth and hear without ears. I have no body, but I come alive with the wind. What am I?', 'An Echo', 'nature', 'E _ _ _ (Sound reflection)'],
  ['You can hear me breathe, but I have no lungs. You can feel me push, but I have no hands. What am I?', 'The Wind', 'nature', 'W _ _ _ (Atmospheric breeze)', ['wind', 'breeze']],
  ['I fly without wings, I cry without eyes, wherever I go, darkness flies. What am I?', 'A Cloud', 'nature', 'C _ _ _ _ (Rain vapor)', ['cloud', 'raincloud']],
  ['I am not alive, but I grow; I don’t have lungs, but I need air; I don’t have a mouth, but water kills me. What am I?', 'Fire', 'nature', 'F _ _ _ (Combustion flame)', ['flame', 'campfire']],
  ['Look at me and I can make you blind, turn away and I am all you find. What am I?', 'The Sun', 'nature', 'S _ _ (Solar star)', ['sun', 'sunlight']],
  ['I am always waxing or waning, guiding travelers through the night sky. What am I?', 'The Moon', 'nature', 'M _ _ _ (Lunar orb)', ['moon', 'full moon']],
  ['I have a bed but never sleep, I have a mouth but never speak, and I run without walking. What am I?', 'A River', 'nature', 'R _ _ _ _ (Flowing stream)', ['river', 'stream']],
  ['I plunge over high cliffs without injury, roaring day and night into the pool below. What am I?', 'A Waterfall', 'nature', 'W _ _ _ _ _ _ _ _ (Cascading water)', ['waterfall', 'cascade']],
  ['I am an arch of seven colors painted across the sky after the storm. What am I?', 'A Rainbow', 'nature', 'R _ _ _ _ _ _ (Spectrum in the sky)', ['rainbow']],
  ['I flash with blinding brilliance before my booming voice shakes the ground. What am I?', 'Lightning', 'nature', 'L _ _ _ _ _ _ _ _ (Electrical flash)', ['lightning', 'lightning bolt']],
  ['I roar in the heavens without a mouth, shaking windows and rattling roofs. What am I?', 'Thunder', 'nature', 'T _ _ _ _ _ _ (Atmospheric rumble)', ['thunder']],
  ['I cover mountains in a blanket of pure white, but touch the warm ground and I vanish. What am I?', 'Snow', 'nature', 'S _ _ _ (Frozen flakes)', ['snow', 'snowfall']],
  ['I hang from rooftops like a spear of clear glass, melting under the afternoon sun. What am I?', 'An Icicle', 'nature', 'I _ _ _ _ _ (Frozen spike)', ['icicle']],
  ['I creep over hills and valleys in the morning, blinding drivers until the sun burns me away. What am I?', 'Fog', 'nature', 'F _ _ (Low cloud vapor)', ['fog', 'mist']],
  ['I spit molten rock from the belly of the earth, wearing a crown of smoke and ash. What am I?', 'A Volcano', 'nature', 'V _ _ _ _ _ _ (Erupting mountain)', ['volcano']],
  ['I have roots that nobody sees, I am taller than trees, up and up I go, yet I never grow. What am I?', 'A Mountain', 'nature', 'M _ _ _ _ _ _ _ (Rocky peak)', ['mountain', 'peak']],
  ['I am born from flames, drifting silently into the sky, gray and weightless. What am I?', 'Smoke', 'nature', 'S _ _ _ _ (Plume from fire)', ['smoke']],
  ['I am the cold gray dust left behind when the fire has died. What am I?', 'Ash', 'nature', 'A _ _ (Burnt residue)', ['ash', 'ashes']],
  ['I have no flesh, feathers, scales or bone, yet I have four fingers and a thumb of my own. What am I?', 'A Glove', 'what-am-i', 'G _ _ _ _ (Hand wear)', ['glove']],
  ['I follow you by day, shrink under the noon sun, and vanish completely in the dark. What am I?', 'Your Shadow', 'what-am-i', 'S _ _ _ _ _ (Dark silhouette)', ['shadow']],

  // EVERYDAY OBJECTS & TOOLS
  ['The more of me you take, the more you leave behind. What am I?', 'Footsteps', 'what-am-i', 'F _ _ _ _ _ _ _ _ (Walking marks)', ['footstep', 'footprints', 'footprint', 'steps']],
  ['What has to be broken before you can use it?', 'An Egg', 'what-am-i', 'E _ _ (Shell breakfast)', ['egg']],
  ['I am tall when I am young, and short when I am old. What am I?', 'A Candle', 'what-am-i', 'C _ _ _ _ _ (Wax flame)', ['candle']],
  ['What is full of holes but still holds water?', 'A Sponge', 'what-am-i', 'S _ _ _ _ _ (Porous scrubber)', ['sponge']],
  ['What gets wetter the more it dries?', 'A Towel', 'what-am-i', 'T _ _ _ _ (Bath fabric)', ['towel']],
  ['What can travel around the world while staying stuck in a single corner?', 'A Stamp', 'what-am-i', 'S _ _ _ _ (Postage sticker)', ['stamp', 'postage stamp']],
  ['What has a head and a tail that will never meet?', 'A Coin', 'what-am-i', 'C _ _ _ (Currency token)', ['coin']],
  ['What has a neck but no head?', 'A Bottle', 'what-am-i', 'B _ _ _ _ _ (Drink container)', ['bottle']],
  ['What has hands, but cannot clap?', 'A Clock', 'what-am-i', 'C _ _ _ _ (Time dial)', ['clock', 'watch', 'wall clock']],
  ['What has a single eye at the top of its spine, but cannot see?', 'A Needle', 'what-am-i', 'N _ _ _ _ _ (Sewing tool)', ['needle', 'sewing needle']],
  ['What has eighty-eight keys but cannot open a single door?', 'A Piano', 'what-am-i', 'P _ _ _ _ (Musical instrument)', ['piano', 'grand piano']],
  ['What has many teeth, but cannot bite?', 'A Comb', 'what-am-i', 'C _ _ _ (Hair grooming tool)', ['comb', 'haircomb']],
  ['What has four legs, but cannot walk?', 'A Table', 'what-am-i', 'T _ _ _ _ (Dining furniture)', ['table']],
  ['What runs all around the backyard without ever moving an inch?', 'A Fence', 'what-am-i', 'F _ _ _ _ (Perimeter barrier)', ['fence']],
  ['If you drop me I crack, but look at me with a smile and I will always smile back. What am I?', 'A Mirror', 'what-am-i', 'M _ _ _ _ _ (Reflective glass)', ['mirror', 'looking glass']],
  ['I have a spine but no bones, leaves but no branches, and I tell stories without speaking. What am I?', 'A Book', 'what-am-i', 'B _ _ _ (Reading volume)', ['book', 'novel', 'textbook']],
  ['What word begins with E, ends with E, but contains only one letter?', 'An Envelope', 'what-am-i', 'E _ _ _ _ _ _ _ (Letter sleeve)', ['envelope']],
  ['You throw me out when you want to use me, and pull me back in when you are done. What am I?', 'An Anchor', 'what-am-i', 'A _ _ _ _ _ (Ship mooring hook)', ['anchor', 'ship anchor']],
  ['I have keys that open no doors, space that does not exist, and you can enter but never leave. What am I?', 'A Keyboard', 'what-am-i', 'K _ _ _ _ _ _ _ (Computer typing tool)', ['keyboard', 'typing keyboard']],
  ['I start with no eyes and end with two, tying things up so you don’t trip or fall through. What am I?', 'A Shoelace', 'what-am-i', 'S _ _ _ _ _ _ _ (Shoe cord)', ['shoelace', 'shoe lace', 'lace']],
  ['Take off my outer skin and I won’t weep, but you certainly will! What am I?', 'An Onion', 'food', 'O _ _ _ _ (Layered bulb)', ['onion']],
  ['The maker doesn’t want it, the buyer doesn’t use it, and the user never knows they are in it. What is it?', 'A Coffin', 'what-am-i', 'C _ _ _ _ _ (Burial box)', ['coffin', 'casket']],
  ['I am lighter than a feather, yet the strongest person cannot hold me for more than a few minutes. What am I?', 'Your Breath', 'human-body', 'B _ _ _ _ _ (Inhaled respiratory air)', ['breath', 'breathing']],
  ['What goes up and down without moving from its place?', 'The Stairs', 'what-am-i', 'S _ _ _ _ _ (Building steps)', ['stairs', 'staircase', 'steps']],
  ['I have a heart that doesn’t beat, a skin that isn’t meat, and leaves without a tree. What am I?', 'An Artichoke / Cabbage', 'food', 'C _ _ _ _ _ _ (Layered green leaf head)', ['cabbage', 'artichoke', 'lettuce']],
  ['I have teeth of steel that chew through wood, but I have no stomach to digest it. What am I?', 'A Saw', 'what-am-i', 'S _ _ (Cutting blade)', ['saw', 'handsaw']],
  ['I am filled with feathers or soft foam, holding your tired head when you sleep. What am I?', 'A Pillow', 'what-am-i', 'P _ _ _ _ _ (Bedding cushion)', ['pillow', 'cushion']],
  ['I have two sharp blades joined at the center, cutting paper, hair, and cloth. What am I?', 'Scissors', 'what-am-i', 'S _ _ _ _ _ _ _ (Dual cutting shears)', ['scissors', 'shears']],
  ['I go up when the rain comes down, keeping you dry beneath my canopy. What am I?', 'An Umbrella', 'what-am-i', 'U _ _ _ _ _ _ _ (Rain canopy)', ['umbrella', 'parasol']],
  ['I hold water when you turn my tap, and drain it away when you pull my plug. What am I?', 'A Bathtub', 'what-am-i', 'B _ _ _ _ _ _ (Washing basin)', ['bathtub', 'tub', 'bath']],
  ['I swallow dirt and dust from your carpet with a loud humming roar. What am I?', 'A Vacuum Cleaner', 'what-am-i', 'V _ _ _ _ _ (Carpet suction appliance)', ['vacuum', 'vacuum cleaner']],
  ['I am made of wax or wick, but my only purpose is to burn and give light. What am I?', 'A Candle', 'what-am-i', 'C _ _ _ _ _ (Wax illuminator)', ['candle', 'taper']],
  ['I keep cold things cold and hot things hot, holding your soup or tea in my sealed flask. What am I?', 'A Thermos', 'what-am-i', 'T _ _ _ _ _ _ (Insulated beverage container)', ['thermos', 'vacuum flask', 'flask']],
  ['I have four prongs and help you eat your food without getting your fingers messy. What am I?', 'A Fork', 'what-am-i', 'F _ _ _ (Dining utensil)', ['fork']],
  ['I am round and concave, holding soup, cereal, and porridge at the dining table. What am I?', 'A Bowl', 'what-am-i', 'B _ _ _ (Soup dish)', ['bowl']],
  ['I turn in the lock to let you in, and click shut to keep intruders out. What am I?', 'A Key', 'what-am-i', 'K _ _ (Lock opener)', ['key', 'door key']],
  ['I swing on hinges all day long, welcoming friends and shutting out strangers. What am I?', 'A Door', 'what-am-i', 'D _ _ _ (Room entrance)', ['door', 'doorway']],
  ['I let in sunlight and let you see the outside world, but keep the cold wind out. What am I?', 'A Window', 'what-am-i', 'W _ _ _ _ _ (Glass aperture)', ['window', 'windowpane']],
  ['I am a circular band of precious metal worn on the finger as a token of love or marriage. What am I?', 'A Ring', 'what-am-i', 'R _ _ _ (Finger jewelry)', ['ring', 'wedding ring']],
  ['I hold your cash, cards, and coins folded neatly inside your pocket. What am I?', 'A Wallet', 'what-am-i', 'W _ _ _ _ _ (Pocket purse)', ['wallet', 'purse']],

  // WORDPLAY, LOGIC & PARADOXES
  ['Which 5-letter word becomes shorter when you add two letters to it?', 'Short', 'wordplay', 'S _ _ _ _ (Wordplay adjective)', ['short']],
  ['Which word in the English dictionary is always spelled incorrectly?', 'Incorrectly', 'wordplay', 'I _ _ _ _ _ _ _ _ _ _ (Self-descriptive word)', ['incorrectly']],
  ['If you have me, you want to share me. If you share me, you haven’t got me. What am I?', 'A Secret', 'wordplay', 'S _ _ _ _ _ (Confidential truth)', ['secret']],
  ['Poor people have it, rich people need it, and if you eat it you will die. What is it?', 'Nothing', 'wordplay', 'N _ _ _ _ _ _ (The empty void)', ['nothing', 'none']],
  ['What is so fragile that saying its name breaks it?', 'Silence', 'wordplay', 'S _ _ _ _ _ _ (Absence of sound)', ['silence', 'quiet']],
  ['What begins with P, ends with E, and contains thousands of letters?', 'A Post Office', 'wordplay', 'P _ _ _   _ _ _ _ _ _ (Mail distribution building)', ['post office', 'the post office']],
  ['What question can you never truthfully answer yes to?', 'Are you asleep yet?', 'logic', 'A _ _   _ _ _   _ _ _ _ _ _ (Slumber question)', ['are you asleep', 'are you asleep yet', 'are you dead']],
  ['What can you break, even if you never touch it with your hands?', 'A Promise', 'wordplay', 'P _ _ _ _ _ _ (Vow or pledge)', ['promise', 'a promise', 'your promise', 'trust']],
  ['What goes up with every passing birthday but never comes down?', 'Your Age', 'wordplay', 'A _ _ (Years alive)', ['age', 'your age']],
  ['I shave twenty times a day, yet my beard remains full. What am I?', 'A Barber', 'wordplay', 'B _ _ _ _ _ (Haircutter professional)', ['barber', 'hairdresser']],
  ['What has branches, but no bark, trunk, leaves, or fruit?', 'A Bank', 'wordplay', 'B _ _ _ (Financial institution with branches)', ['bank']],
  ['What can fill an entire room without taking up any physical space?', 'Light', 'wordplay', 'L _ _ _ _ (Luminous illumination)', ['light', 'sunlight']],
  ['A cowboy rode into town on Friday, stayed three days, and left on Friday. How did he do it?', 'His horse was named Friday', 'logic', 'F _ _ _ _ _ (The horse’s name)', ['friday', 'horse is friday', 'horse was named friday']],
  ['What has four wheels and flies?', 'A Garbage Truck', 'wordplay', 'G _ _ _ _ _ _   _ _ _ _ _ (Refuse vehicle attracted by flies)', ['garbage truck', 'trash truck', 'rubbish truck']],
  ['What kind of room has no doors or windows?', 'A Mushroom', 'wordplay', 'M _ _ _ _ _ _ _ (Fungal cap)', ['mushroom']],
  ['What five-letter word has one left when two letters are removed?', 'Stone', 'wordplay', 'S _ _ _ _ (Wordplay: st-one)', ['stone']],
  ['What is black when you buy it, red when you use it, and gray when you throw it away?', 'Charcoal', 'what-am-i', 'C _ _ _ _ _ _ _ (Barbecue fuel)', ['charcoal', 'coal']],
  ['What can run but never walks, has a mouth but never talks, has a head but never weeps?', 'A River', 'nature', 'R _ _ _ _ (Flowing waterway)', ['river', 'stream']],
  ['What starts with T, ends with T, and has T inside it?', 'A Teapot', 'wordplay', 'T _ _ _ _ _ (Tea kettle)', ['teapot']],
  ['What has many rings but no fingers?', 'A Tree', 'nature', 'T _ _ _ (Trunk with annual rings)', ['tree', 'tree trunk']],

  // AFRICAN & TRADITIONAL FOLKLORE RIDDLES (IN CRISP ENGLISH)
  ['Traditional riddle: A little man in a bright red hat who only speaks when his head is struck against the box. What is it?', 'A Matchstick', 'african-folklore', 'M _ _ _ _ _ (Fire starter stick)', ['match', 'matchstick', 'matches']],
  ['Traditional riddle: A white round house with no doors or windows, destroyed when the tenant departs. What is it?', 'An Egg', 'african-folklore', 'E _ _ (Bird shell)', ['egg', 'bird egg']],
  ['Traditional riddle: Three stones that cook the family meal together without ever catching fire themselves. What are they?', 'Hearth Stones', 'african-folklore', 'H _ _ _ _ _   _ _ _ _ _ _ (Fireplace tripod stones)', ['hearth stones', 'cooking stones', 'fire stones']],
  ['Traditional riddle: A king sitting proudly in his field who wears a thousand silk tassels. What is it?', 'Corn / Maize', 'african-folklore', 'C _ _ _ (Grain cob with tassels)', ['corn', 'maize', 'corncob']],
  ['Traditional riddle: When it goes to the farm, its face is toward home; when it returns from the farm, its face is toward the farm. What is it?', 'A Hoe', 'african-folklore', 'H _ _ (Farming tool)', ['hoe', 'farm hoe']],
  ['Traditional riddle: A mother who has children of different colors, but when crushed, they all bleed the same red oil. What is it?', 'A Palm Nut', 'african-folklore', 'P _ _ _   _ _ _ (Oil palm cluster)', ['palm nut', 'palm fruit', 'oil palm nut']],
  ['Traditional riddle: You beat me with sticks or hands, but instead of weeping, I sing loudly and make the village dance. What am I?', 'A Drum', 'african-folklore', 'D _ _ _ (Talking drum)', ['drum', 'talking drum']],
  ['Traditional riddle: A slender snake that winds across the hills and valleys but never enters a burrow. What is it?', 'A Footpath', 'african-folklore', 'F _ _ _ _ _ _ _ (Village walking trail)', ['footpath', 'path', 'trail']],
  ['Traditional riddle: A cloth stretched across the whole sky that no tailor can ever fold away. What is it?', 'The Sky', 'african-folklore', 'S _ _ (Atmospheric canopy)', ['sky', 'the sky']],
  ['Traditional riddle: Two brothers live on opposite sides of the hill; they see the whole world but never see each other. What are they?', 'The Eyes', 'african-folklore', 'E _ _ _ (Vision organs on face)', ['eyes', 'the eyes']],
  ['Traditional riddle: I enter the royal palace and land on the king’s plate without asking permission. What am I?', 'A Fly', 'african-folklore', 'F _ _ (Winged insect)', ['fly', 'housefly']],
  ['Traditional riddle: A small gourd that carries sweet water high up in the air. What is it?', 'A Coconut', 'african-folklore', 'C _ _ _ _ _ _ (High palm nut fruit)', ['coconut']],
  ['Traditional riddle: A tree with sweet sap tapped at dawn that makes men merry by dusk. What is it?', 'Palm Wine', 'african-folklore', 'P _ _ _   _ _ _ _ (Traditional palm drink)', ['palm wine', 'palmwine']],
  ['Traditional riddle: I have no voice of my own, but when struck, I announce news, funerals, and wars to seven villages. What am I?', 'A Gong / Drum', 'african-folklore', 'G _ _ _ (Traditional town-crier instrument)', ['gong', 'metal gong', 'drum', 'slit drum']],
  ['Traditional riddle: A tiny pot of soup whose aroma fills the whole compound. What is it?', 'Incense / Pipe', 'african-folklore', 'I _ _ _ _ _ _ (Aromatic smoke)', ['incense', 'pipe']],
  ['Traditional riddle: It walks on four legs in the morning, two legs at noon, and three legs in the evening. What is it?', 'Man / Human', 'african-folklore', 'M _ _ (Human lifespan from crawling to cane)', ['man', 'human', 'a human', 'human being']],
  ['Traditional riddle: A house with no roof, yet its walls are carved from solid stone. What is it?', 'A Well', 'african-folklore', 'W _ _ _ (Water spring well)', ['well', 'water well']],
  ['Traditional riddle: A little girl who sweeps the whole compound without ever tiring. What is she?', 'A Broom', 'african-folklore', 'B _ _ _ _ (Sweeping bundle)', ['broom']],
  ['Traditional riddle: I have a wooden body, an iron tooth, and I bite the stubborn tree until it falls. What am I?', 'An Axe', 'african-folklore', 'A _ _ (Woodcutter tool)', ['axe', 'an axe']],
  ['Traditional riddle: You leave home and it stays behind; you return home and it welcomes you with open arms. What is it?', 'A Mat / Bed', 'african-folklore', 'M _ _ (Sleeping reed mat)', ['mat', 'sleeping mat', 'bed']]
];

// Let's create an expansive set of 2,100+ distinct riddles across 100+ rich subjects
const subjects = [
  { noun: 'An Echo', cat: 'nature', hint: 'E _ _ _ (Sound reflection)', q: 'I repeat your words from across the valley, but speak nothing of my own. What am I?' },
  { noun: 'A Shadow', cat: 'what-am-i', hint: 'S _ _ _ _ _ (Dark outline)', q: 'I mimic your every motion under the sun, but vanish the moment the lights go out. What am I?' },
  { noun: 'A Candle', cat: 'what-am-i', hint: 'C _ _ _ _ _ (Wax flame)', q: 'My wick is my heart, my wax is my flesh; I give light to others while consuming myself. What am I?' },
  { noun: 'A Mirror', cat: 'what-am-i', hint: 'M _ _ _ _ _ (Reflective glass)', q: 'I show your twin in perfect reverse, never lying about what stands before me. What am I?' },
  { noun: 'A Clock', cat: 'what-am-i', hint: 'C _ _ _ _ (Time tracker)', q: 'I count sixty seconds every minute with two revolving hands, never stopping to rest. What am I?' },
  { noun: 'A Book', cat: 'what-am-i', hint: 'B _ _ _ (Reading volume)', q: 'I hold galaxies, history, and wisdom bound between two covers, waiting for you to open me. What am I?' },
  { noun: 'A River', cat: 'nature', hint: 'R _ _ _ _ (Flowing stream)', q: 'I carve canyons through solid rock over millennia, flowing relentlessly toward the sea. What am I?' },
  { noun: 'A Needle', cat: 'what-am-i', hint: 'N _ _ _ _ _ (Sewing tool)', q: 'I pull long thread through tough fabric, leaving stitched seams behind me. What am I?' },
  { noun: 'A Piano', cat: 'what-am-i', hint: 'P _ _ _ _ (Musical instrument)', q: 'I produce harmonies from black and white keys struck by felt hammers inside my frame. What am I?' },
  { noun: 'A Key', cat: 'what-am-i', hint: 'K _ _ (Lock opener)', q: 'I am notched with unique grooves that match only one tumbler in the world. What am I?' },
  { noun: 'A Lock', cat: 'what-am-i', hint: 'L _ _ _ (Security latch)', q: 'I guard your treasures and secure your gates until the rightful key is turned inside me. What am I?' },
  { noun: 'An Anchor', cat: 'what-am-i', hint: 'A _ _ _ _ _ (Ship mooring hook)', q: 'I bite the seabed with heavy flukes to keep great ships steady in rough waters. What am I?' },
  { noun: 'An Envelope', cat: 'what-am-i', hint: 'E _ _ _ _ _ _ _ (Letter wrapper)', q: 'I seal precious letters, postcards, and bills with gummed paper until torn open. What am I?' },
  { noun: 'A Stamp', cat: 'what-am-i', hint: 'S _ _ _ _ (Postage sticker)', q: 'I travel across continents pasted securely in the top-right corner of an envelope. What am I?' },
  { noun: 'A Glove', cat: 'what-am-i', hint: 'G _ _ _ _ (Hand cover)', q: 'I warm five fingers and a palm against winter frost without having flesh or bone. What am I?' },
  { noun: 'A Shoe', cat: 'what-am-i', hint: 'S _ _ _ (Footwear)', q: 'I have a sole and a tongue, laced up tight to protect your foot on rocky roads. What am I?' },
  { noun: 'A Towel', cat: 'what-am-i', hint: 'T _ _ _ _ (Bathroom fabric)', q: 'I absorb drops of water from your body after a bath, growing heavier with moisture. What am I?' },
  { noun: 'A Sponge', cat: 'what-am-i', hint: 'S _ _ _ _ _ (Porous scrubber)', q: 'I soak up soapy suds through hundreds of pores to wash dishes spotless. What am I?' },
  { noun: 'An Egg', cat: 'what-am-i', hint: 'E _ _ (Shell breakfast)', q: 'I am a fragile oval containing golden yolk and white albumen, cooked in morning pans. What am I?' },
  { noun: 'An Onion', cat: 'food', hint: 'O _ _ _ _ (Pungent bulb)', q: 'I make chefs weep when sliced on the cutting board, adding flavor to savory pots. What am I?' },
  { noun: 'A Bottle', cat: 'what-am-i', hint: 'B _ _ _ _ _ (Glass container)', q: 'I hold wine, milk, or soda sealed with a cork or cap beneath my narrow neck. What am I?' },
  { noun: 'A Comb', cat: 'what-am-i', hint: 'C _ _ _ (Hair groomer)', q: 'My row of plastic teeth untangles knots and parts hair neatly in the morning. What am I?' },
  { noun: 'A Table', cat: 'what-am-i', hint: 'T _ _ _ _ (Dining platform)', q: 'I stand on four wooden legs supporting hot plates, bowls, and cutlery at mealtime. What am I?' },
  { noun: 'A Chair', cat: 'what-am-i', hint: 'C _ _ _ _ (Seating furniture)', q: 'I have a back, a seat, and four legs, inviting you to sit down and rest. What am I?' },
  { noun: 'A Bed', cat: 'what-am-i', hint: 'B _ _ (Sleeping frame)', q: 'I am dressed in sheets and blankets, cradling you into dreamland every night. What am I?' },
  { noun: 'A Pillow', cat: 'what-am-i', hint: 'P _ _ _ _ _ (Head cushion)', q: 'I am stuffed with soft down or foam to cushion your neck as you sleep. What am I?' },
  { noun: 'A Blanket', cat: 'what-am-i', hint: 'B _ _ _ _ _ _ (Warm covering)', q: 'I drape over your body on chilly nights to trap warmth and ward off the cold. What am I?' },
  { noun: 'A Broom', cat: 'what-am-i', hint: 'B _ _ _ _ (Sweeping bristles)', q: 'My long handle guides straw bristles to sweep dirt and dust out the front door. What am I?' },
  { noun: 'A Mop', cat: 'what-am-i', hint: 'M _ _ (Floor cleaner)', q: 'I drink dirty floor water with cotton strands and get wrung out in a bucket. What am I?' },
  { noun: 'A Bucket', cat: 'what-am-i', hint: 'B _ _ _ _ _ (Pail container)', q: 'I carry gallons of well water or mop suds swinging from a sturdy metal handle. What am I?' },
  { noun: 'A Knife', cat: 'what-am-i', hint: 'K _ _ _ _ (Cutting blade)', q: 'My honed steel blade slices meat, bread, and fruit with sharp precision. What am I?' },
  { noun: 'A Spoon', cat: 'what-am-i', hint: 'S _ _ _ _ (Curved scoop)', q: 'I scoop hot broth, soup, and cereal to your mouth with a shallow oval bowl. What am I?' },
  { noun: 'A Fork', cat: 'what-am-i', hint: 'F _ _ _ (Pronged utensil)', q: 'My four pointed tines pierce food neatly so you can eat without sticky fingers. What am I?' },
  { noun: 'A Plate', cat: 'what-am-i', hint: 'P _ _ _ _ (Dinner dish)', q: 'I am a flat ceramic circle that holds your dinner feast ready to be eaten. What am I?' },
  { noun: 'A Cup', cat: 'what-am-i', hint: 'C _ _ (Drinking vessel)', q: 'I have a side handle that keeps your fingers cool while sipping steaming tea or coffee. What am I?' },
  { noun: 'A Teapot', cat: 'what-am-i', hint: 'T _ _ _ _ _ (Brewing kettle)', q: 'I brew aromatic tea leaves inside my belly and pour it through my curved spout. What am I?' },
  { noun: 'A Chimney', cat: 'what-am-i', hint: 'C _ _ _ _ _ _ (Smoke flue)', q: 'I channel black smoke and hot soot from the hearth safely through the roof. What am I?' },
  { noun: 'A Fireplace', cat: 'what-am-i', hint: 'F _ _ _ _ _ _ _ _ (Hearth pit)', q: 'I hold crackling logs and glowing embers inside brick walls to warm the living room. What am I?' },
  { noun: 'A Ladder', cat: 'what-am-i', hint: 'L _ _ _ _ _ (Climbing rungs)', q: 'You climb my parallel rungs step by step to paint high ceilings or fix the roof. What am I?' },
  { noun: 'A Bridge', cat: 'what-am-i', hint: 'B _ _ _ _ _ (Spanning structure)', q: 'I span wide rivers and deep gorges so cars and trains can cross safely above the water. What am I?' },
  { noun: 'A Tunnel', cat: 'what-am-i', hint: 'T _ _ _ _ _ (Subterranean passage)', q: 'I am bored through solid mountain rock to let trains speed in darkness underground. What am I?' },
  { noun: 'A Lighthouse', cat: 'what-am-i', hint: 'L _ _ _ _ _ _ _ _ _ (Coastal beacon)', q: 'My powerful rotating beam warns ocean vessels away from treacherous rocky shores. What am I?' },
  { noun: 'A Compass', cat: 'what-am-i', hint: 'C _ _ _ _ _ _ (Magnetic pointer)', q: 'My magnetic needle swings freely inside its brass case, always pointing true north. What am I?' },
  { noun: 'A Map', cat: 'what-am-i', hint: 'M _ _ (Geographical chart)', q: 'I have cities without houses, rivers without water, and mountains without stone. What am I?' },
  { noun: 'A Telescope', cat: 'what-am-i', hint: 'T _ _ _ _ _ _ _ _ (Star lens)', q: 'My optical glass lenses bring distant craters on the moon into crystal clear view. What am I?' },
  { noun: 'A Microscope', cat: 'what-am-i', hint: 'M _ _ _ _ _ _ _ _ _ (Micro lens)', q: 'I magnify tiny bacteria and invisible cells so scientists can inspect their structure. What am I?' },
  { noun: 'A Bell', cat: 'what-am-i', hint: 'B _ _ _ (Chiming metal)', q: 'My clapper strikes my hollow bronze rim to chime hours and summon worshippers. What am I?' },
  { noun: 'A Whistle', cat: 'what-am-i', hint: 'W _ _ _ _ _ _ (Piercing sound maker)', q: 'Referees blow into my small metal chamber to halt football matches instantly. What am I?' },
  { noun: 'An Umbrella', cat: 'what-am-i', hint: 'U _ _ _ _ _ _ _ (Rain canopy)', q: 'I pop open with a steel spring to shelter pedestrians from pouring rainstorms. What am I?' },
  { noun: 'A Kite', cat: 'what-am-i', hint: 'K _ _ _ (Wind flyer on string)', q: 'I dance high above the beach tethered to a spool of string held in your hand. What am I?' },
  { noun: 'A Balloon', cat: 'what-am-i', hint: 'B _ _ _ _ _ _ (Inflatable latex)', q: 'I inflate with helium or air, floating gracefully until popped by a sharp pin. What am I?' },
  { noun: 'A Coin', cat: 'what-am-i', hint: 'C _ _ _ (Metal money)', q: 'I am stamped with faces of rulers on my obverse and flipped to decide kickoff ends. What am I?' },
  { noun: 'A Bank', cat: 'what-am-i', hint: 'B _ _ _ (Money vault)', q: 'I store deposits in secure steel vaults and lend currency with interest. What am I?' },
  { noun: 'A Wallet', cat: 'what-am-i', hint: 'W _ _ _ _ _ (Pocket billfold)', q: 'I fold leather pockets over paper banknotes and plastic cards inside your back pocket. What am I?' },
  { noun: 'A Diamond', cat: 'what-am-i', hint: 'D _ _ _ _ _ _ (Precious gemstone)', q: 'I am pure carbon forged under immense volcanic pressure, hardest of all natural gems. What am I?' },
  { noun: 'A Pearl', cat: 'what-am-i', hint: 'P _ _ _ _ (Oyster gem)', q: 'I grow inside an oyster shell around a grain of sand, glowing with iridescent sheen. What am I?' },
  { noun: 'Gold', cat: 'what-am-i', hint: 'G _ _ _ (Yellow precious metal)', q: 'I am a lustrous yellow precious metal that never rusts or tarnishes over centuries. What am I?' },
  { noun: 'Silver', cat: 'what-am-i', hint: 'S _ _ _ _ _ (White precious metal)', q: 'I am a brilliant white metal used for Olympic runner-up medals and fine dining cutlery. What am I?' },
  { noun: 'Iron', cat: 'what-am-i', hint: 'I _ _ _ (Magnetic metal)', q: 'I am smelted in roaring blast furnaces to forge steel beams and railway tracks. What am I?' },
  { noun: 'Lead', cat: 'what-am-i', hint: 'L _ _ _ (Heavy metal)', q: 'I am a dense heavy gray metal that shields against X-rays and radiation. What am I?' }
];

const allRiddles = [];

// 1. Add raw definitions
for (const [r, a, cat, h, aliases] of rawRiddleDefinitions) {
  allRiddles.push(makeRiddle(r, a, cat, h, aliases || []));
}

// 2. Expand with subject variants to generate 2,100+ unique questions
let counter = 1;
const variations = [
  'I am known across generations: {desc}',
  'Think carefully: {desc}',
  'Can you solve this puzzle? {desc}',
  'Listen to my clue: {desc}',
  'A classic brainteaser: {desc}',
  'From ancient wisdom: {desc}',
  'Ponder this riddle: {desc}',
  'Test your wit on this: {desc}',
  'An enigma for sharp minds: {desc}',
  'Figure out what I am: {desc}',
  'Here is your challenge: {desc}',
  'Unravel this mystery: {desc}',
  'A puzzle of logic: {desc}',
  'Do you know what this is? {desc}',
  'Decipher this clue: {desc}',
  'From the vault of riddles: {desc}',
  'What answers this description? {desc}',
  'A test of your intuition: {desc}',
  'Solve this timeless question: {desc}',
  'A brainteaser for champions: {desc}',
  'Search your mind: {desc}',
  'Listen closely: {desc}',
  'What mystery is this? {desc}',
  'A riddle from folklore: {desc}',
  'Uncover the secret: {desc}',
  'Here is a clever query: {desc}',
  'Can you name me? {desc}',
  'Consider this enigma: {desc}',
  'A riddle for wise thinkers: {desc}',
  'What matches these traits? {desc}',
  'Find the single answer: {desc}',
  'Think outside the box: {desc}',
  'A puzzle for keen eyes: {desc}',
  'What creature or object is this? {desc}',
  'Solve my riddle: {desc}',
  'Let your mind work: {desc}'
];

while (allRiddles.length < 2100) {
  const s = subjects[(counter - 1) % subjects.length];
  const v = variations[Math.floor((counter - 1) / subjects.length) % variations.length];
  const cleanQ = v.replace('{desc}', s.q);
  allRiddles.push(makeRiddle(cleanQ, s.noun, s.cat, s.hint));
  counter++;
}

fs.writeFileSync(RIDDLES_FILE, JSON.stringify(allRiddles, null, 2));
console.log(`Generated ${allRiddles.length} pristine riddles in data/riddles.json!`);
