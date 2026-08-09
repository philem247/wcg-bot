import { writeFile } from 'fs/promises'
import { randomUUID } from 'crypto'

function shuffle(array) {
  return array.sort(() => Math.random() - 0.5)
}

function generateQs(data, templates, extractCorrect, extractWrong) {
  const qs = []
  const wrongPool = [...new Set(data.map(extractWrong))].filter(Boolean)
  for (const item of data) {
    for (const t of templates) {
      const qText = t(item)
      if (!qText) continue
      const correct = extractCorrect(item)
      if (!correct) continue
      const wrong = shuffle(wrongPool.filter(p => p !== correct)).slice(0, 3)
      if (wrong.length === 3) {
        qs.push({ id: randomUUID(), q: qText, correct, wrong })
      }
    }
  }
  return qs
}

const art = [
  { p: 'Mona Lisa', a: 'Leonardo da Vinci', m: 'Renaissance', l: 'Louvre' },
  { p: 'The Starry Night', a: 'Vincent van Gogh', m: 'Post-Impressionism', l: 'MoMA' },
  { p: 'The Last Supper', a: 'Leonardo da Vinci', m: 'Renaissance', l: 'Santa Maria delle Grazie' },
  { p: 'The Scream', a: 'Edvard Munch', m: 'Expressionism', l: 'National Gallery' },
  { p: 'Guernica', a: 'Pablo Picasso', m: 'Cubism', l: 'Museo Reina Sofia' },
  { p: 'The Kiss', a: 'Gustav Klimt', m: 'Symbolism', l: 'Belvedere' },
  { p: 'Girl with a Pearl Earring', a: 'Johannes Vermeer', m: 'Baroque', l: 'Mauritshuis' },
  { p: 'The Birth of Venus', a: 'Sandro Botticelli', m: 'Renaissance', l: 'Uffizi Gallery' },
  { p: 'Las Meninas', a: 'Diego Velazquez', m: 'Baroque', l: 'Museo del Prado' },
  { p: 'The Creation of Adam', a: 'Michelangelo', m: 'Renaissance', l: 'Sistine Chapel' },
  { p: 'American Gothic', a: 'Grant Wood', m: 'Modernism', l: 'Art Institute of Chicago' },
  { p: 'The Persistence of Memory', a: 'Salvador Dali', m: 'Surrealism', l: 'MoMA' },
  { p: 'The Night Watch', a: 'Rembrandt', m: 'Baroque', l: 'Rijksmuseum' },
  { p: 'Water Lilies', a: 'Claude Monet', m: 'Impressionism', l: 'Musée de l\'Orangerie' },
  { p: 'Impression, Sunrise', a: 'Claude Monet', m: 'Impressionism', l: 'Musée Marmottan Monet' },
  { p: 'Café Terrace at Night', a: 'Vincent van Gogh', m: 'Post-Impressionism', l: 'Kröller-Müller Museum' },
  { p: 'A Sunday on La Grande Jatte', a: 'Georges Seurat', m: 'Pointillism', l: 'Art Institute of Chicago' },
  { p: 'The Son of Man', a: 'René Magritte', m: 'Surrealism', l: 'Private Collection' },
  { p: 'Wanderer above the Sea of Fog', a: 'Caspar David Friedrich', m: 'Romanticism', l: 'Kunsthalle Hamburg' },
  { p: 'Liberty Leading the People', a: 'Eugène Delacroix', m: 'Romanticism', l: 'Louvre' },
  { p: 'The School of Athens', a: 'Raphael', m: 'Renaissance', l: 'Vatican Museums' },
  { p: 'Composition VIII', a: 'Wassily Kandinsky', m: 'Abstract Art', l: 'Guggenheim Museum' },
  { p: 'The Great Wave off Kanagawa', a: 'Katsushika Hokusai', m: 'Ukiyo-e', l: 'Metropolitan Museum of Art' },
  { p: 'Dogs Playing Poker', a: 'Cassius Marcellus Coolidge', m: 'Kitsch', l: 'Private Collection' },
  { p: 'Nighthawks', a: 'Edward Hopper', m: 'Realism', l: 'Art Institute of Chicago' }
]

const nigerianFoods = [
  { f: 'Jollof Rice', i: 'Rice, Tomatoes, Peppers', r: 'West Africa' },
  { f: 'Pounded Yam', i: 'Yam', r: 'South-West Nigeria' },
  { f: 'Egusi Soup', i: 'Melon Seeds, Leafy Vegetables', r: 'Nigeria' },
  { f: 'Suya', i: 'Beef, Yaji Spice', r: 'Northern Nigeria' },
  { f: 'Akara', i: 'Black-Eyed Peas', r: 'Nigeria' },
  { f: 'Moi Moi', i: 'Black-Eyed Peas', r: 'Nigeria' },
  { f: 'Efo Riro', i: 'Spinach, Locust Beans', r: 'South-West Nigeria' },
  { f: 'Afang Soup', i: 'Afang Leaves, Waterleaf', r: 'South-South Nigeria' },
  { f: 'Edikang Ikong', i: 'Waterleaf, Ugwu', r: 'South-South Nigeria' },
  { f: 'Amala', i: 'Yam Flour or Cassava Flour', r: 'South-West Nigeria' },
  { f: 'Ewedu', i: 'Jute Leaves', r: 'South-West Nigeria' },
  { f: 'Banga Soup', i: 'Palm Nut Extract', r: 'South-South Nigeria' },
  { f: 'Tuwo Shinkafa', i: 'Mashed Rice', r: 'Northern Nigeria' },
  { f: 'Nkwobi', i: 'Cow Foot, Utazi Leaves', r: 'South-East Nigeria' },
  { f: 'Isi Ewu', i: 'Goat Head', r: 'South-East Nigeria' },
  { f: 'Ofe Onugbu', i: 'Bitterleaf', r: 'South-East Nigeria' },
  { f: 'Ewa Agoyin', i: 'Mashed Beans, Palm Oil Sauce', r: 'South-West Nigeria' },
  { f: 'Kilishi', i: 'Dried Meat, Spices', r: 'Northern Nigeria' },
  { f: 'Boli', i: 'Roasted Plantain', r: 'South-West Nigeria' },
  { f: 'Abacha', i: 'African Salad, Cassava', r: 'South-East Nigeria' },
  { f: 'Ofe Owerri', i: 'Assorted Meats, Vegetables', r: 'South-East Nigeria' },
  { f: 'Zobo', i: 'Hibiscus Leaves', r: 'Northern Nigeria' },
  { f: 'Masa', i: 'Fermented Rice Dough', r: 'Northern Nigeria' },
  { f: 'Fufu', i: 'Cassava', r: 'Nigeria' },
  { f: 'Garri', i: 'Cassava Flakes', r: 'Nigeria' },
  { f: 'Eba', i: 'Cassava Flakes, Hot Water', r: 'Nigeria' },
  { f: 'Ogbono Soup', i: 'Wild Mango Seeds', r: 'South-East Nigeria' },
  { f: 'Okpa', i: 'Bambara Nut', r: 'South-East Nigeria' },
  { f: 'Gbegiri', i: 'Beans', r: 'South-West Nigeria' },
  { f: 'Miyan Kuka', i: 'Baobab Leaves', r: 'Northern Nigeria' },
  { f: 'Miyan Taushe', i: 'Pumpkin, Groundnuts', r: 'Northern Nigeria' },
  { f: 'Ofe Akwu', i: 'Palm Nut Extract', r: 'South-East Nigeria' },
  { f: 'Ofe Nsala', i: 'White Soup, Catfish', r: 'South-East Nigeria' },
  { f: 'Adalu', i: 'Beans and Corn', r: 'South-West Nigeria' },
  { f: 'Ikokore', i: 'Water Yam', r: 'South-West Nigeria' },
  { f: 'Ofada Rice', i: 'Unpolished Rice', r: 'South-West Nigeria' },
  { f: 'Asaro', i: 'Yam Porridge', r: 'South-West Nigeria' },
  { f: 'Bole and Fish', i: 'Roasted Plantain, Fish', r: 'South-South Nigeria' },
  { f: 'Fura da Nono', i: 'Millet, Fermented Milk', r: 'Northern Nigeria' },
  { f: 'Kunu', i: 'Millet or Sorghum', r: 'Northern Nigeria' },
  { f: 'Wara', i: 'Curdled Milk (Cheese)', r: 'Northern Nigeria' },
  { f: 'Ekimu', i: 'Fermented Maize', r: 'Nigeria' },
  { f: 'Dan Wake', i: 'Bean Dumplings', r: 'Northern Nigeria' },
  { f: 'Oha Soup', i: 'Oha Leaves', r: 'South-East Nigeria' },
  { f: 'Ekwang', i: 'Grated Cocoyam', r: 'South-South Nigeria' },
  { f: 'Fisherman Soup', i: 'Fresh Seafood', r: 'South-South Nigeria' },
  { f: 'Owo Soup', i: 'Starch, Palm Oil', r: 'South-South Nigeria' },
  { f: 'Starch (Usi)', i: 'Cassava Starch', r: 'South-South Nigeria' },
  { f: 'Ofe Owerri', i: 'Assorted Meats, Vegetables', r: 'South-East Nigeria' },
  { f: 'Banga and Starch', i: 'Palm Nut Extract, Cassava Starch', r: 'South-South Nigeria' }
]

async function main() {
  const bank = { art: [], 'nigerian-food': [] }

  // Art Questions
  bank['art'].push(...generateQs(art, [
    a => `Who painted the masterpiece "${a.p}"?`,
    a => `The famous painting "${a.p}" was created by which artist?`,
    a => `Which renowned painter is responsible for "${a.p}"?`,
    a => `If you were looking at "${a.p}", whose work would you be admiring?`
  ], a => a.a, a => a.a))

  bank['art'].push(...generateQs(art, [
    a => `Which art movement is "${a.p}" most commonly associated with?`,
    a => `The style of "${a.p}" is a prime example of which art movement?`,
    a => `The painting "${a.p}" is a famous work of:`
  ], a => a.m, a => a.m))

  bank['art'].push(...generateQs(art, [
    a => `Where is the original "${a.p}" painting currently housed?`,
    a => `If you wanted to view "${a.p}" in person, which museum would you visit?`,
    a => `The masterpiece "${a.p}" is a major attraction at which famous location?`
  ], a => a.l, a => a.l))

  // Nigerian Food Questions
  const africanFoods = ['Injera', 'Waakye', 'Bunny Chow', 'Ugali', 'Kelewele', 'Ndole', 'Sadza', 'Chapati', 'Bobotie', 'Couscous', 'Koshari', 'Matoke', 'Pap', 'Braai', 'Gatsby', 'Biltong', 'Chakalaka', 'Kapenta', 'Sukuma Wiki', 'Frikkadel']

  const nTemplates = [
    (f) => `Which of these is a traditional Nigerian food?`,
    (f) => `If you were eating traditional food in Nigeria, what might you be served?`,
    (f) => `Which of the following dishes originates from Nigeria?`,
    (f) => `A famous culinary staple in Nigeria is which of these dishes?`,
    (f) => `If you visited a Nigerian restaurant, which of these would likely be on the menu?`,
    (f) => `Which of these dishes is indigenous to West Africa, specifically Nigeria?`
  ]
  
  for (const item of nigerianFoods) {
    for (const temp of nTemplates) {
      bank['nigerian-food'].push({
        id: randomUUID(),
        q: temp(item),
        correct: item.f,
        wrong: shuffle([...africanFoods]).slice(0, 3)
      })
    }
  }

  bank['nigerian-food'].push(...generateQs(nigerianFoods, [
    f => `What is the primary ingredient or component of the Nigerian dish ${f.f}?`,
    f => `To prepare the traditional dish ${f.f}, you would definitely need:`,
    f => `The core base of ${f.f} is primarily made from:`
  ], f => f.i, f => f.i))

  bank['nigerian-food'].push(...generateQs(nigerianFoods, [
    f => `Which region of Nigeria is most famously associated with the dish ${f.f}?`,
    f => `The dish ${f.f} is traditionally indigenous to which part of Nigeria?`
  ], f => f.r, f => f.r))

  const output = {
    attribution: "Culture Hardcoded Generator",
    generated: new Date().toISOString(),
    categories: bank
  }
  
  await writeFile('./data/culture.json', JSON.stringify(output, null, 2))
  console.log(`Saved to data/culture.json with Art: ${bank['art'].length}, Nigerian Food: ${bank['nigerian-food'].length}`)
}

main()
