import { readFileSync, writeFileSync } from 'node:fs';

const categories = JSON.parse(readFileSync('data/categories.json', 'utf8'));
const approved = JSON.parse(readFileSync('data/validator-approved.json', 'utf8'));

function fold(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Map of canonical existing items that an approved answer should be an alias of
const aliasMappings = {
  'Clothing items': {
    'trouser': 'Trousers',
    'shoe': 'Shoes',
    'polo': 'Polo Shirt',
  },
  'Colours': {
    'vermillion': 'Vermilion',
    'emerald green': 'Emerald',
  },
  'Household items': {
    'fridge': 'Refrigerator',
    'remote': 'Remote Control',
  },
  'Mammals': {
    'chimpanzees': 'Chimpanzee',
  },
  'Parts of the body': {
    'feet': 'Foot',
    'toes': 'Toe',
  },
  'Musical instruments': {
    'drum': 'Drums',
  },
  'Board games': {
    'snake and ladder': 'Snakes and Ladders',
  },
  'Occupations': {
    'police': 'Police Officer',
  },
  'Football clubs in Germany': {
    'leverkusen': 'Bayer Leverkusen',
    'freiburg': 'SC Freiburg',
    'mainz': 'Mainz 05',
  },
  'Football clubs in England': {
    'salford': 'Salford City',
  },
  'Football clubs in France': {
    'clermont foot': 'Clermont',
  },
  'Weather types': {
    'rainy': 'Rain',
    'windy': 'Wind',
    'cloudy': 'Cloud',
    'stormy': 'Storm',
    'foggy': 'Fog',
  },
  'Units of measurement': {
    'centimeter': 'Centimetre',
    'millimeter': 'Millimetre',
    'kilometer': 'Kilometre',
    'feet': 'Foot',
  },
  'World currencies': {
    'ghana cedis': 'Cedi',
    'indian rupee': 'Rupee',
    'nepalese rupee': 'Rupee',
    'canadian dollar': 'Dollar',
    'australian dollar': 'Dollar',
  },
  'Smartphone brands': {
    'google pixel': 'Google',
  },
};

// Map of canonical title casing for items added as new canonical items
const canonicalCasing = {
  'brassiere': 'Brassiere',
  'boxers': 'Boxers',
  'deep blue': 'Deep Blue',
  'jet': 'Jet',
  'chopstick': 'Chopstick',
  'pot': 'Pot',
  'stool': 'Stool',
  'human': 'Human',
  'monkey': 'Monkey',
  'polar bear': 'Polar Bear',
  'ape': 'Ape',
  'boar': 'Boar',
  'penis': 'Penis',
  'agbalumo': 'Agbalumo',
  'pomelo': 'Pomelo',
  'mahjong': 'Mahjong',
  'karting': 'Karting',
  'ophthalmologist': 'Ophthalmologist',
  'dijon': 'Dijon FCO',
  'poco': 'Poco',
  'kilowatt': 'Kilowatt',
  'kilocalorie': 'Kilocalorie',
  'joules': 'Joule',
  'amperes': 'Ampere',
  'atmosphere': 'Atmosphere',
  'volts': 'Volt',
  'kilo joules': 'Kilojoule',
  'square centimetre': 'Square Centimetre',
  'decibels': 'Decibel',
};

let aliasesAdded = 0;
let itemsAdded = 0;

for (const entry of approved) {
  const cat = categories.find(c => c.category === entry.category);
  if (!cat) {
    console.warn(`Category not found: ${entry.category}`);
    continue;
  }

  cat.aliases = cat.aliases || {};
  const sAns = entry.answer.trim().toLowerCase();
  const fAns = fold(entry.answer);

  // Check if this answer maps to an alias of an existing item
  const categoryAliasMap = aliasMappings[entry.category] || {};
  const targetExistingItem = categoryAliasMap[sAns];

  if (targetExistingItem && cat.items.includes(targetExistingItem)) {
    cat.aliases[targetExistingItem] = cat.aliases[targetExistingItem] || [];
    if (!cat.aliases[targetExistingItem].some(a => fold(a) === fAns)) {
      cat.aliases[targetExistingItem].push(sAns);
      aliasesAdded++;
      console.log(`[ALIAS] Added "${sAns}" as alias for "${targetExistingItem}" in ${entry.category}`);
    }
    continue;
  }

  // Otherwise, check if already in items or aliases
  const alreadyInItems = cat.items.some(i => fold(i) === fAns);
  let alreadyInAliases = false;
  for (const alList of Object.values(cat.aliases)) {
    if (alList.some(a => fold(a) === fAns)) {
      alreadyInAliases = true;
      break;
    }
  }

  if (alreadyInItems || alreadyInAliases) {
    continue;
  }

  // Add as new item
  const formattedItem = canonicalCasing[sAns] || (entry.answer.charAt(0).toUpperCase() + entry.answer.slice(1).trim());
  cat.items.push(formattedItem);
  itemsAdded++;

  // Add common aliases if helpful
  if (sAns === 'brassiere') {
    cat.aliases[formattedItem] = ['bra'];
  } else if (sAns === 'dijon') {
    cat.aliases[formattedItem] = ['dijon'];
  } else if (sAns === 'joules') {
    cat.aliases[formattedItem] = ['joules', 'joule'];
  } else if (sAns === 'amperes') {
    cat.aliases[formattedItem] = ['amperes', 'ampere', 'amps', 'amp'];
  } else if (sAns === 'volts') {
    cat.aliases[formattedItem] = ['volts', 'volt'];
  } else if (sAns === 'decibels') {
    cat.aliases[formattedItem] = ['decibels', 'decibel', 'db'];
  } else if (sAns === 'karting') {
    cat.aliases[formattedItem] = ['go-karting', 'go karting'];
  } else if (sAns === 'chopstick') {
    cat.aliases[formattedItem] = ['chopsticks'];
  } else if (sAns === 'poco') {
    cat.aliases[formattedItem] = ['poco phone'];
  }

  console.log(`[ITEM] Added "${formattedItem}" to ${entry.category}`);
}

console.log(`\nSummary: Added ${itemsAdded} new items and ${aliasesAdded} aliases across categories.`);

writeFileSync('data/categories.json', JSON.stringify(categories, null, 2) + '\n');
console.log('Saved data/categories.json successfully.');
