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
      const correct = extractCorrect(item)
      const wrong = shuffle(wrongPool.filter(p => p !== correct)).slice(0, 3)
      if (wrong.length === 3) {
        qs.push({ id: randomUUID(), q: qText, correct, wrong })
      }
    }
  }
  return qs
}

const videogames = [
  { g: 'Super Mario Bros.', d: 'Nintendo', y: '1985', c: 'Mario' },
  { g: 'The Legend of Zelda: Ocarina of Time', d: 'Nintendo', y: '1998', c: 'Link' },
  { g: 'Halo: Combat Evolved', d: 'Bungie', y: '2001', c: 'Master Chief' },
  { g: 'God of War (2018)', d: 'Santa Monica Studio', y: '2018', c: 'Kratos' },
  { g: 'The Witcher 3: Wild Hunt', d: 'CD Projekt Red', y: '2015', c: 'Geralt of Rivia' },
  { g: 'Grand Theft Auto V', d: 'Rockstar North', y: '2013', c: 'Michael De Santa' },
  { g: 'Red Dead Redemption 2', d: 'Rockstar Games', y: '2018', c: 'Arthur Morgan' },
  { g: 'Minecraft', d: 'Mojang', y: '2011', c: 'Steve' },
  { g: 'Tomb Raider', d: 'Core Design', y: '1996', c: 'Lara Croft' },
  { g: 'Uncharted 2: Among Thieves', d: 'Naughty Dog', y: '2009', c: 'Nathan Drake' },
  { g: 'The Last of Us', d: 'Naughty Dog', y: '2013', c: 'Joel' },
  { g: 'Metal Gear Solid', d: 'Konami', y: '1998', c: 'Solid Snake' },
  { g: 'Final Fantasy VII', d: 'Square', y: '1997', c: 'Cloud Strife' },
  { g: 'Sonic the Hedgehog', d: 'Sega', y: '1991', c: 'Sonic' },
  { g: 'Elden Ring', d: 'FromSoftware', y: '2022', c: 'The Tarnished' },
  { g: 'Overwatch', d: 'Blizzard Entertainment', y: '2016', c: 'Tracer' },
  { g: 'Resident Evil 4', d: 'Capcom', y: '2005', c: 'Leon S. Kennedy' },
  { g: 'Mass Effect 2', d: 'BioWare', y: '2010', c: 'Commander Shepard' },
  { g: 'Half-Life 2', d: 'Valve', y: '2004', c: 'Gordon Freeman' },
  { g: 'Street Fighter II', d: 'Capcom', y: '1991', c: 'Ryu' }
]

const movies = [
  { m: 'Pulp Fiction', d: 'Quentin Tarantino', y: '1994', a: 'John Travolta' },
  { m: 'The Dark Knight', d: 'Christopher Nolan', y: '2008', a: 'Christian Bale' },
  { m: 'Inception', d: 'Christopher Nolan', y: '2010', a: 'Leonardo DiCaprio' },
  { m: 'The Godfather', d: 'Francis Ford Coppola', y: '1972', a: 'Marlon Brando' },
  { m: 'Fight Club', d: 'David Fincher', y: '1999', a: 'Brad Pitt' },
  { m: 'Forrest Gump', d: 'Robert Zemeckis', y: '1994', a: 'Tom Hanks' },
  { m: 'The Matrix', d: 'The Wachowskis', y: '1999', a: 'Keanu Reeves' },
  { m: 'Goodfellas', d: 'Martin Scorsese', y: '1990', a: 'Ray Liotta' },
  { m: 'Titanic', d: 'James Cameron', y: '1997', a: 'Leonardo DiCaprio' },
  { m: 'Jurassic Park', d: 'Steven Spielberg', y: '1993', a: 'Sam Neill' },
  { m: 'Gladiator', d: 'Ridley Scott', y: '2000', a: 'Russell Crowe' },
  { m: 'Avatar', d: 'James Cameron', y: '2009', a: 'Sam Worthington' },
  { m: 'Schindler\'s List', d: 'Steven Spielberg', y: '1993', a: 'Liam Neeson' },
  { m: 'The Shawshank Redemption', d: 'Frank Darabont', y: '1994', a: 'Tim Robbins' },
  { m: 'Inglourious Basterds', d: 'Quentin Tarantino', y: '2009', a: 'Brad Pitt' },
  { m: 'Interstellar', d: 'Christopher Nolan', y: '2014', a: 'Matthew McConaughey' },
  { m: 'The Lord of the Rings: The Return of the King', d: 'Peter Jackson', y: '2003', a: 'Elijah Wood' },
  { m: 'Star Wars: Episode IV - A New Hope', d: 'George Lucas', y: '1977', a: 'Mark Hamill' },
  { m: 'The Silence of the Lambs', d: 'Jonathan Demme', y: '1991', a: 'Jodie Foster' },
  { m: 'Saving Private Ryan', d: 'Steven Spielberg', y: '1998', a: 'Tom Hanks' },
  { m: 'The Green Mile', d: 'Frank Darabont', y: '1999', a: 'Tom Hanks' },
  { m: 'Se7en', d: 'David Fincher', y: '1995', a: 'Morgan Freeman' },
  { m: 'The Departed', d: 'Martin Scorsese', y: '2006', a: 'Leonardo DiCaprio' },
  { m: 'Whiplash', d: 'Damien Chazelle', y: '2014', a: 'Miles Teller' },
  { m: 'The Prestige', d: 'Christopher Nolan', y: '2006', a: 'Christian Bale' },
  { m: 'The Lion King', d: 'Roger Allers and Rob Minkoff', y: '1994', a: 'Matthew Broderick' },
  { m: 'Back to the Future', d: 'Robert Zemeckis', y: '1985', a: 'Michael J. Fox' },
  { m: 'Spirited Away', d: 'Hayao Miyazaki', y: '2001', a: 'Rumi Hiiragi' },
  { m: 'Parasite', d: 'Bong Joon-ho', y: '2019', a: 'Song Kang-ho' },
  { m: 'The Pianist', d: 'Roman Polanski', y: '2002', a: 'Adrien Brody' },
  { m: 'Terminator 2: Judgment Day', d: 'James Cameron', y: '1991', a: 'Arnold Schwarzenegger' },
  { m: 'Alien', d: 'Ridley Scott', y: '1979', a: 'Sigourney Weaver' },
  { m: 'Psycho', d: 'Alfred Hitchcock', y: '1960', a: 'Anthony Perkins' },
  { m: 'The Shining', d: 'Stanley Kubrick', y: '1980', a: 'Jack Nicholson' },
  { m: 'Django Unchained', d: 'Quentin Tarantino', y: '2012', a: 'Jamie Foxx' },
  { m: 'The Dark Knight Rises', d: 'Christopher Nolan', y: '2012', a: 'Christian Bale' },
  { m: 'Avengers: Endgame', d: 'Anthony and Joe Russo', y: '2019', a: 'Robert Downey Jr.' },
  { m: 'Spider-Man: Into the Spider-Verse', d: 'Bob Persichetti, Peter Ramsey, Rodney Rothman', y: '2018', a: 'Shameik Moore' },
  { m: 'Joker', d: 'Todd Phillips', y: '2019', a: 'Joaquin Phoenix' },
  { m: 'Braveheart', d: 'Mel Gibson', y: '1995', a: 'Mel Gibson' },
  { m: 'Toy Story', d: 'John Lasseter', y: '1995', a: 'Tom Hanks' },
  { m: 'Catch Me If You Can', d: 'Steven Spielberg', y: '2002', a: 'Leonardo DiCaprio' },
  { m: 'The Wolf of Wall Street', d: 'Martin Scorsese', y: '2013', a: 'Leonardo DiCaprio' },
  { m: 'No Country for Old Men', d: 'Joel and Ethan Coen', y: '2007', a: 'Javier Bardem' },
  { m: 'The Truman Show', d: 'Peter Weir', y: '1998', a: 'Jim Carrey' },
  { m: 'Mad Max: Fury Road', d: 'George Miller', y: '2015', a: 'Tom Hardy' },
  { m: 'Shutter Island', d: 'Martin Scorsese', y: '2010', a: 'Leonardo DiCaprio' },
  { m: 'Rocky', d: 'John G. Avildsen', y: '1976', a: 'Sylvester Stallone' }
]

const tvShows = [
  { s: 'Breaking Bad', n: 'AMC', c: 'Albuquerque', r: 'Vince Gilligan' },
  { s: 'Stranger Things', n: 'Netflix', c: 'Hawkins', r: 'The Duffer Brothers' },
  { s: 'The Wire', n: 'HBO', c: 'Baltimore', r: 'David Simon' },
  { s: 'The Sopranos', n: 'HBO', c: 'New Jersey', r: 'David Chase' },
  { s: 'Mad Men', n: 'AMC', c: 'New York City', r: 'Matthew Weiner' },
  { s: 'The Office (US)', n: 'NBC', c: 'Scranton', r: 'Greg Daniels' },
  { s: 'Parks and Recreation', n: 'NBC', c: 'Pawnee', r: 'Greg Daniels & Michael Schur' },
  { s: 'Game of Thrones', n: 'HBO', c: 'Westeros', r: 'David Benioff & D.B. Weiss' },
  { s: 'Succession', n: 'HBO', c: 'New York City', r: 'Jesse Armstrong' },
  { s: 'True Detective', n: 'HBO', c: 'Louisiana', r: 'Nic Pizzolatto' },
  { s: 'Friends', n: 'NBC', c: 'New York City', r: 'David Crane & Marta Kauffman' },
  { s: 'Seinfeld', n: 'NBC', c: 'New York City', r: 'Larry David & Jerry Seinfeld' },
  { s: 'Atlanta', n: 'FX', c: 'Atlanta', r: 'Donald Glover' },
  { s: 'Better Call Saul', n: 'AMC', c: 'Albuquerque', r: 'Vince Gilligan & Peter Gould' },
  { s: 'The Boys', n: 'Amazon Prime', c: 'New York City', r: 'Eric Kripke' },
  { s: 'Peaky Blinders', n: 'BBC', c: 'Birmingham', r: 'Steven Knight' },
  { s: 'Fargo', n: 'FX', c: 'Minnesota/North Dakota', r: 'Noah Hawley' },
  { s: 'Black Mirror', n: 'Channel 4 / Netflix', c: 'Various', r: 'Charlie Brooker' },
  { s: 'Chernobyl', n: 'HBO', c: 'Pripyat', r: 'Craig Mazin' },
  { s: 'Narcos', n: 'Netflix', c: 'Colombia', r: 'Chris Brancato' },
  { s: 'Mindhunter', n: 'Netflix', c: 'Quantico', r: 'Joe Penhall' },
  { s: 'The Crown', n: 'Netflix', c: 'London', r: 'Peter Morgan' },
  { s: 'Sherlock', n: 'BBC', c: 'London', r: 'Steven Moffat & Mark Gatiss' },
  { s: 'Westworld', n: 'HBO', c: 'Westworld Theme Park', r: 'Jonathan Nolan & Lisa Joy' },
  { s: 'House of Cards', n: 'Netflix', c: 'Washington D.C.', r: 'Beau Willimon' },
  { s: 'Dexter', n: 'Showtime', c: 'Miami', r: 'James Manos Jr.' },
  { s: 'Lost', n: 'ABC', c: 'The Island', r: 'J.J. Abrams, Damon Lindelof' },
  { s: 'Arrested Development', n: 'Fox', c: 'Orange County', r: 'Mitchell Hurwitz' },
  { s: 'It\'s Always Sunny in Philadelphia', n: 'FX', c: 'Philadelphia', r: 'Rob McElhenney' },
  { s: 'The Mandalorian', n: 'Disney+', c: 'The Outer Rim', r: 'Jon Favreau' },
  { s: 'Severance', n: 'Apple TV+', c: 'Lumon Industries', r: 'Dan Erickson' },
  { s: 'Ted Lasso', n: 'Apple TV+', c: 'London', r: 'Jason Sudeikis & Bill Lawrence' },
  { s: 'Brooklyn Nine-Nine', n: 'Fox / NBC', c: 'New York City', r: 'Dan Goor & Michael Schur' },
  { s: 'The Marvelous Mrs. Maisel', n: 'Amazon Prime', c: 'New York City', r: 'Amy Sherman-Palladino' },
  { s: 'Fleabag', n: 'BBC', c: 'London', r: 'Phoebe Waller-Bridge' },
  { s: 'Barry', n: 'HBO', c: 'Los Angeles', r: 'Alec Berg & Bill Hader' },
  { s: 'Twin Peaks', n: 'ABC', c: 'Twin Peaks', r: 'David Lynch & Mark Frost' },
  { s: 'The X-Files', n: 'Fox', c: 'Various', r: 'Chris Carter' },
  { s: 'Curb Your Enthusiasm', n: 'HBO', c: 'Los Angeles', r: 'Larry David' },
  { s: 'Mr. Robot', n: 'USA Network', c: 'New York City', r: 'Sam Esmail' },
  { s: 'BoJack Horseman', n: 'Netflix', c: 'Hollywoo', r: 'Raphael Bob-Waksberg' },
  { s: 'Rick and Morty', n: 'Adult Swim', c: 'Various Dimensions', r: 'Justin Roiland & Dan Harmon' },
  { s: 'Doctor Who', n: 'BBC', c: 'Various (Time & Space)', r: 'Sydney Newman' }
]

// Massive geographical expansion (Top 50 most recognizable to guarantee high quality)
const geography = [
  { c: 'Argentina', cap: 'Buenos Aires', con: 'South America', cur: 'Peso' },
  { c: 'Australia', cap: 'Canberra', con: 'Oceania', cur: 'Dollar' },
  { c: 'Brazil', cap: 'Brasilia', con: 'South America', cur: 'Real' },
  { c: 'Canada', cap: 'Ottawa', con: 'North America', cur: 'Dollar' },
  { c: 'China', cap: 'Beijing', con: 'Asia', cur: 'Yuan' },
  { c: 'Egypt', cap: 'Cairo', con: 'Africa', cur: 'Pound' },
  { c: 'France', cap: 'Paris', con: 'Europe', cur: 'Euro' },
  { c: 'Germany', cap: 'Berlin', con: 'Europe', cur: 'Euro' },
  { c: 'India', cap: 'New Delhi', con: 'Asia', cur: 'Rupee' },
  { c: 'Italy', cap: 'Rome', con: 'Europe', cur: 'Euro' },
  { c: 'Japan', cap: 'Tokyo', con: 'Asia', cur: 'Yen' },
  { c: 'Mexico', cap: 'Mexico City', con: 'North America', cur: 'Peso' },
  { c: 'Nigeria', cap: 'Abuja', con: 'Africa', cur: 'Naira' },
  { c: 'Russia', cap: 'Moscow', con: 'Europe/Asia', cur: 'Ruble' },
  { c: 'South Africa', cap: 'Pretoria', con: 'Africa', cur: 'Rand' },
  { c: 'Spain', cap: 'Madrid', con: 'Europe', cur: 'Euro' },
  { c: 'United Kingdom', cap: 'London', con: 'Europe', cur: 'Pound Sterling' },
  { c: 'United States', cap: 'Washington D.C.', con: 'North America', cur: 'Dollar' },
  { c: 'South Korea', cap: 'Seoul', con: 'Asia', cur: 'Won' },
  { c: 'Turkey', cap: 'Ankara', con: 'Europe/Asia', cur: 'Lira' },
  { c: 'Indonesia', cap: 'Jakarta', con: 'Asia', cur: 'Rupiah' },
  { c: 'Saudi Arabia', cap: 'Riyadh', con: 'Asia', cur: 'Riyal' },
  { c: 'Sweden', cap: 'Stockholm', con: 'Europe', cur: 'Krona' },
  { c: 'Norway', cap: 'Oslo', con: 'Europe', cur: 'Krone' },
  { c: 'Kenya', cap: 'Nairobi', con: 'Africa', cur: 'Shilling' },
  { c: 'Argentina', cap: 'Buenos Aires', con: 'South America', cur: 'Peso' },
  { c: 'Chile', cap: 'Santiago', con: 'South America', cur: 'Peso' },
  { c: 'Colombia', cap: 'Bogota', con: 'South America', cur: 'Peso' },
  { c: 'Peru', cap: 'Lima', con: 'South America', cur: 'Sol' },
  { c: 'Venezuela', cap: 'Caracas', con: 'South America', cur: 'Bolivar' },
  { c: 'New Zealand', cap: 'Wellington', con: 'Oceania', cur: 'Dollar' },
  { c: 'Fiji', cap: 'Suva', con: 'Oceania', cur: 'Dollar' },
  { c: 'Ethiopia', cap: 'Addis Ababa', con: 'Africa', cur: 'Birr' },
  { c: 'Ghana', cap: 'Accra', con: 'Africa', cur: 'Cedi' },
  { c: 'Morocco', cap: 'Rabat', con: 'Africa', cur: 'Dirham' }
]

const scienceElements = [
  { e: 'Hydrogen', s: 'H', n: '1' },
  { e: 'Helium', s: 'He', n: '2' },
  { e: 'Lithium', s: 'Li', n: '3' },
  { e: 'Carbon', s: 'C', n: '6' },
  { e: 'Nitrogen', s: 'N', n: '7' },
  { e: 'Oxygen', s: 'O', n: '8' },
  { e: 'Fluorine', s: 'F', n: '9' },
  { e: 'Neon', s: 'Ne', n: '10' },
  { e: 'Sodium', s: 'Na', n: '11' },
  { e: 'Magnesium', s: 'Mg', n: '12' },
  { e: 'Aluminum', s: 'Al', n: '13' },
  { e: 'Silicon', s: 'Si', n: '14' },
  { e: 'Phosphorus', s: 'P', n: '15' },
  { e: 'Sulfur', s: 'S', n: '16' },
  { e: 'Chlorine', s: 'Cl', n: '17' },
  { e: 'Potassium', s: 'K', n: '19' },
  { e: 'Calcium', s: 'Ca', n: '20' },
  { e: 'Iron', s: 'Fe', n: '26' },
  { e: 'Copper', s: 'Cu', n: '29' },
  { e: 'Zinc', s: 'Zn', n: '30' },
  { e: 'Silver', s: 'Ag', n: '47' },
  { e: 'Tin', s: 'Sn', n: '50' },
  { e: 'Gold', s: 'Au', n: '79' },
  { e: 'Mercury', s: 'Hg', n: '80' },
  { e: 'Lead', s: 'Pb', n: '82' }
]

const scienceInventors = [
  { i: 'Alexander Graham Bell', n: 'Telephone' },
  { i: 'Thomas Edison', n: 'Light Bulb' },
  { i: 'Nikola Tesla', n: 'Alternating Current (AC)' },
  { i: 'Guglielmo Marconi', n: 'Radio' },
  { i: 'Tim Berners-Lee', n: 'World Wide Web' },
  { i: 'Johannes Gutenberg', n: 'Printing Press' },
  { i: 'Wright Brothers', n: 'Airplane' },
  { i: 'Alexander Fleming', n: 'Penicillin' },
  { i: 'Karl Benz', n: 'Automobile' },
  { i: 'Charles Babbage', n: 'Mechanical Computer' }
]

const sciencePlanets = [
  { p: 'Mercury', f: 'closest planet to the Sun' },
  { p: 'Venus', f: 'hottest planet in our solar system' },
  { p: 'Earth', f: 'only known planet to support life' },
  { p: 'Mars', f: 'Red Planet' },
  { p: 'Jupiter', f: 'largest planet in our solar system' },
  { p: 'Saturn', f: 'planet famous for its prominent ring system' },
  { p: 'Uranus', f: 'planet that rotates on its side' },
  { p: 'Neptune', f: 'farthest known planet from the Sun' }
]

const health = [
  { d: "Diabetes", o: "Pancreas", i: "Insulin", c: "High blood sugar" },
  { d: "Hypertension", o: "Heart & Blood Vessels", i: "Blood Pressure", c: "High blood pressure" },
  { d: "Asthma", o: "Lungs", i: "Airways", c: "Breathing difficulty" },
  { d: "Leukemia", o: "Bone Marrow", i: "White Blood Cells", c: "Blood cancer" },
  { d: "Glaucoma", o: "Eyes", i: "Optic Nerve", c: "Vision loss from high pressure" },
  { d: "Osteoporosis", o: "Bones", i: "Bone Density", c: "Brittle or fragile bones" },
  { d: "Anemia", o: "Blood", i: "Red Blood Cells / Hemoglobin", c: "Low oxygen-carrying capacity" },
  { d: "Cirrhosis", o: "Liver", i: "Liver Tissue", c: "Liver scarring" },
  { d: "Alzheimer's Disease", o: "Brain", i: "Neurons", c: "Memory loss and cognitive decline" },
  { d: "Parkinson's Disease", o: "Brain", i: "Dopamine-producing cells", c: "Tremors and motor control loss" },
  { d: "Psoriasis", o: "Skin", i: "Skin cells", c: "Scaly, itchy skin patches" },
  { d: "Cataracts", o: "Eyes", i: "Lens", c: "Clouding of the eye's lens" },
  { d: "Arrhythmia", o: "Heart", i: "Electrical impulses", c: "Irregular heartbeat" },
  { d: "Hemophilia", o: "Blood", i: "Clotting proteins", c: "Inability of blood to clot properly" },
  { d: "Gastritis", o: "Stomach", i: "Stomach lining", c: "Inflammation of the stomach lining" },
  { d: "Meningitis", o: "Brain & Spinal Cord", i: "Meninges", c: "Inflammation of protective membranes" },
  { d: "Gout", o: "Joints", i: "Uric Acid", c: "Severe joint pain, usually in the big toe" },
  { d: "Scurvy", o: "Whole Body", i: "Vitamin C", c: "Vitamin C deficiency" },
  { d: "Rickets", o: "Bones", i: "Vitamin D", c: "Softening and weakening of bones in children" },
  { d: "Tuberculosis", o: "Lungs", i: "Mycobacterium", c: "Bacterial infection causing severe coughing" },
  { d: "Melanoma", o: "Skin", i: "Melanocytes", c: "Severe type of skin cancer" },
  { d: "Atherosclerosis", o: "Blood Vessels", i: "Arteries", c: "Plaque buildup in the arteries" },
  { d: "Hepatitis", o: "Liver", i: "Liver cells", c: "Inflammation of the liver" },
  { d: "Hypothyroidism", o: "Thyroid Gland", i: "Thyroid hormone", c: "Underactive thyroid gland" },
  { d: "Tinnitus", o: "Ears", i: "Auditory system", c: "Ringing or buzzing in the ears" }
]

const techGadgets = [
  { g: "iPhone", c: "Apple", y: "2007", t: "Smartphone" },
  { g: "iPad", c: "Apple", y: "2010", t: "Tablet" },
  { g: "MacBook", c: "Apple", y: "2006", t: "Laptop" },
  { g: "Watch (Smartwatch)", c: "Apple", y: "2015", t: "Smartwatch" },
  { g: "AirPods", c: "Apple", y: "2016", t: "Wireless Earbuds" },
  { g: "Galaxy S Series", c: "Samsung", y: "2010", t: "Smartphone" },
  { g: "Galaxy Z Fold", c: "Samsung", y: "2019", t: "Foldable Smartphone" },
  { g: "PlayStation", c: "Sony", y: "1994", t: "Video Game Console" },
  { g: "Walkman", c: "Sony", y: "1979", t: "Portable Audio Player" },
  { g: "Xbox", c: "Microsoft", y: "2001", t: "Video Game Console" },
  { g: "Surface Pro", c: "Microsoft", y: "2013", t: "2-in-1 PC" },
  { g: "Kindle", c: "Amazon", y: "2007", t: "E-reader" },
  { g: "Echo (Alexa)", c: "Amazon", y: "2014", t: "Smart Speaker" },
  { g: "Pixel", c: "Google", y: "2016", t: "Smartphone" },
  { g: "Chromecast", c: "Google", y: "2013", t: "Digital Media Player" },
  { g: "Switch", c: "Nintendo", y: "2017", t: "Video Game Console" },
  { g: "Game Boy", c: "Nintendo", y: "1989", t: "Handheld Game Console" },
  { g: "ThinkPad", c: "IBM / Lenovo", y: "1992", t: "Laptop" },
  { g: "Raspberry Pi", c: "Raspberry Pi Foundation", y: "2012", t: "Single-board Computer" },
  { g: "Oculus Rift", c: "Oculus (Meta)", y: "2016", t: "VR Headset" },
  { g: "Hero Action Camera", c: "GoPro", y: "2004", t: "Action Camera" },
  { g: "Roomba", c: "iRobot", y: "2002", t: "Robotic Vacuum Cleaner" },
  { g: "Fitbit", c: "Fitbit", y: "2009", t: "Fitness Tracker" },
  { g: "BlackBerry", c: "Research In Motion (RIM)", y: "1999", t: "Smartphone" },
  { g: "Nokia 3310", c: "Nokia", y: "2000", t: "Mobile Phone" },
  { g: "Steam Deck", c: "Valve", y: "2022", t: "Handheld Gaming PC" },
  { g: "AirTag", c: "Apple", y: "2021", t: "Tracking Device" },
  { g: "PlayStation 5", c: "Sony", y: "2020", t: "Video Game Console" },
  { g: "Oculus Quest 2", c: "Meta", y: "2020", t: "VR Headset" },
  { g: "DJI Mavic", c: "DJI", y: "2016", t: "Camera Drone" }
]

async function main() {
  const bank = {
    videogames: [],
    movies: [],
    'tv-shows': [],
    geography: [],
    science: []
  }
  
  // Videogames
  bank['videogames'].push(...generateQs(videogames, [
    g => `Which studio developed the video game "${g.g}"?`,
    g => `Which video game studio is responsible for creating "${g.g}"?`
  ], g => g.d, g => g.d))
  bank['videogames'].push(...generateQs(videogames, [
    g => `In what year was the original "${g.g}" released?`
  ], g => g.y, g => g.y))
  bank['videogames'].push(...generateQs(videogames, [
    g => `Who is the primary protagonist of "${g.g}"?`
  ], g => g.c, g => g.c))

  // Movies
  bank['movies'].push(...generateQs(movies, [
    m => `Who directed the critically acclaimed film "${m.m}"?`,
    m => `Which famous director is known for helming "${m.m}"?`,
    m => `The movie "${m.m}" was directed by whom?`,
    m => `Which filmmaker was behind the camera for "${m.m}"?`
  ], m => m.d, m => m.d))
  bank['movies'].push(...generateQs(movies, [
    m => `In what year was the movie "${m.m}" released?`,
    m => `When did the film "${m.m}" first hit theaters?`,
    m => `What is the release year of "${m.m}"?`
  ], m => m.y, m => m.y))
  bank['movies'].push(...generateQs(movies, [
    m => `Which famous actor starred as the lead in "${m.m}"?`,
    m => `Who played a major leading role in "${m.m}"?`,
    m => `Which of these actors had a starring role in "${m.m}"?`
  ], m => m.a, m => m.a))

  // TV-Shows
  bank['tv-shows'].push(...generateQs(tvShows, [
    s => `Which television network originally aired "${s.s}"?`,
    s => `The hit TV show "${s.s}" premiered on which network?`,
    s => `Where could you originally watch the series "${s.s}"?`
  ], s => s.n, s => s.n))
  bank['tv-shows'].push(...generateQs(tvShows, [
    s => `In which city or setting does "${s.s}" primarily take place?`,
    s => `Where does the main plot of "${s.s}" primarily occur?`,
    s => `The TV series "${s.s}" is famously set in which location?`
  ], s => s.c, s => s.c))
  bank['tv-shows'].push(...generateQs(tvShows, [
    s => `Who is the creator or showrunner of "${s.s}"?`,
    s => `Which television writer/producer created "${s.s}"?`,
    s => `The television series "${s.s}" was created by whom?`
  ], s => s.r, s => s.r))

  // Geography
  bank['geography'].push(...generateQs(geography, [c => `What is the capital city of ${c.c}?`], c => c.cap, c => c.cap))
  bank['geography'].push(...generateQs(geography, [c => `Which continent is ${c.c} located in?`], c => c.con, c => c.con))
  bank['geography'].push(...generateQs(geography, [c => `What is the primary currency used in ${c.c}?`], c => c.cur, c => c.cur))

  // Science
  bank['science'].push(...generateQs(scienceElements, [e => `What is the chemical symbol for the element ${e.e}?`], e => e.s, e => e.s))
  bank['science'].push(...generateQs(scienceElements, [e => `Which element is represented by the symbol "${e.s}"?`], e => e.e, e => e.e))
  bank['science'].push(...generateQs(scienceElements, [e => `What is the atomic number of ${e.e}?`], e => e.n, e => e.n))
  
  bank['science'].push(...generateQs(scienceInventors, [i => `Who is credited with inventing the ${i.n}?`], i => i.i, i => i.i))
  bank['science'].push(...generateQs(scienceInventors, [i => `${i.i} is famously credited with inventing which of the following?`], i => i.n, i => i.n))
  
  bank['science'].push(...generateQs(sciencePlanets, [p => `Which planet is known as the ${p.f}?`], p => p.p, p => p.p))

  // Health
  bank['health'] = []
  bank['health'].push(...generateQs(health, [
    h => `The medical condition "${h.d}" primarily affects which organ or body system?`,
    h => `If a patient is diagnosed with ${h.d}, which part of their body is mainly affected?`,
    h => `Which organ is closely associated with the disease ${h.d}?`,
    h => `The disease known as ${h.d} targets the:`,
    h => `Which body system suffers the most when a person has ${h.d}?`,
    h => `An specialist treating ${h.d} would focus their attention on the:`
  ], h => h.o, h => h.o))
  bank['health'].push(...generateQs(health, [
    h => `What is the primary characteristic or symptom of ${h.d}?`,
    h => `Which of these is a defining trait of ${h.d}?`,
    h => `A doctor suspecting ${h.d} would look for:`,
    h => `Patients suffering from ${h.d} typically exhibit which of the following?`,
    h => `The hallmark symptom of ${h.d} is known to be:`,
    h => `How does ${h.d} usually present itself symptomatically?`
  ], h => h.c, h => h.c))
  bank['health'].push(...generateQs(health, [
    h => `A deficiency or problem with ${h.i} is heavily associated with which condition?`,
    h => `Which disease involves a dysfunction related to ${h.i}?`,
    h => `If you have an issue with ${h.i}, you might suffer from:`,
    h => `Medical conditions linked specifically to ${h.i} include:`,
    h => `A patient with abnormal levels or function of ${h.i} could be diagnosed with:`
  ], h => h.d, h => h.d))
  bank['health'].push(...generateQs(health, [
    h => `Which biological component is most directly impacted by or involved in ${h.d}?`,
    h => `What does the condition ${h.d} directly affect at a cellular or biological level?`,
    h => `The key biological factor involved in ${h.d} is:`,
    h => `Treatment for ${h.d} often targets what specific bodily component?`,
    h => `In patients with ${h.d}, the underlying issue often stems from:`
  ], h => h.i, h => h.i))

  // Tech Gadgets
  bank['tech-gadgets'] = []
  bank['tech-gadgets'].push(...generateQs(techGadgets, [
    g => `Which company is the manufacturer of the "${g.g}"?`,
    g => `The popular gadget known as ${g.g} is made by which tech giant?`,
    g => `Who is the creator of the ${g.g}?`,
    g => `Which brand released the ${g.g}?`,
    g => `If you want to buy a brand new ${g.g}, which company's store would you visit?`,
    g => `The ${g.g} was designed and released by:`
  ], g => g.c, g => g.c))
  bank['tech-gadgets'].push(...generateQs(techGadgets, [
    g => `What type of device is the ${g.c} ${g.g}?`,
    g => `The ${g.g} belongs to which category of electronics?`,
    g => `If you bought a ${g.g}, what did you just purchase?`,
    g => `How is the ${g.g} officially classified?`,
    g => `Which of these best describes the functionality of the ${g.g}?`
  ], g => g.t, g => g.t))
  bank['tech-gadgets'].push(...generateQs(techGadgets, [
    g => `In what year was the original ${g.g} first released?`,
    g => `When did the world first see the ${g.g}?`,
    g => `The ${g.g} made its debut in which year?`,
    g => `The initial launch year for the ${g.g} was:`,
    g => `Which year saw the introduction of the ${g.g}?`
  ], g => g.y, g => g.y))
  bank['tech-gadgets'].push(...generateQs(techGadgets, [
    g => `${g.c} is famous for releasing which of the following devices?`,
    g => `Which of these iconic gadgets is a product of ${g.c}?`,
    g => `If you were a fan of ${g.c}, you might own a:`,
    g => `A flagship device from ${g.c} is the:`,
    g => `Which of these products was introduced to the market by ${g.c}?`
  ], g => g.g, g => g.g))

  // Final deduplication & massive scale
  for (const cat of Object.keys(bank)) {
    const seen = new Set()
    bank[cat] = bank[cat].filter(q => {
      if (!q.q || !q.correct || q.wrong.length < 3) return false
      if (seen.has(q.q)) return false
      seen.add(q.q)
      return true
    })
  }

  const output = {
    attribution: "Massive Hardcoded Generators Phase 3",
    generated: new Date().toISOString(),
    categories: bank
  }
  
  await writeFile('./data/mega3.json', JSON.stringify(output, null, 2))
  console.log(`Saved to data/mega3.json with TV/Movies/Games/Geo/Science`)
}

main()
