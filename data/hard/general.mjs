// Hand-written hard general-knowledge questions (2026-10). Plausible decoys,
// settled facts only, grouped by template so they spread across games.
const q = (template, text, correct, wrong) => ({ template, q: text, correct, wrong })

export const PACK = {
  category: 'general',
  questions: [
    // ── Numbers ─────────────────────────────
    q('hard-numbers', 'How many bones are in the adult human body?', '206', ['208', '212', '201']),
    q('hard-numbers', 'How many keys does a standard modern piano have?', '88', ['86', '92', '76']),
    q('hard-numbers', 'How many hearts does an octopus have?', 'Three', ['Two', 'Four', 'One']),
    q('hard-numbers', 'As of 2020, how many time zones does Russia span?', '11', ['9', '12', '10']),
    q('hard-numbers', 'How many players does each side have on the field in rugby union?', '15', ['13', '11', '12']),
    q('hard-numbers', 'How many minutes are there in a day?', '1,440', ['1,240', '1,460', '1,400']),
    q('hard-numbers', 'How many sides does a dodecagon have?', '12', ['10', '11', '20']),
    q('hard-numbers', 'How many teeth does an adult human typically have, including wisdom teeth?', '32', ['28', '30', '34']),
    q('hard-numbers', 'What is the smallest prime number?', '2', ['1', '3', '0']),

    // ── Firsts ─────────────────────────────
    q('hard-firsts', 'Who was the first woman to win a Nobel Prize?', 'Marie Curie', ['Mother Teresa', 'Bertha von Suttner', 'Jane Addams']),
    q('hard-firsts', 'Who was the first African to win the Nobel Prize in Literature?', 'Wole Soyinka', ['Chinua Achebe', 'Naguib Mahfouz', 'Nadine Gordimer']),
    q('hard-firsts', 'Who was the second person to walk on the Moon?', 'Buzz Aldrin', ['Michael Collins', 'Pete Conrad', 'Alan Shepard']),
    q('hard-firsts', 'Which country was the first to give women the vote in national elections, in 1893?', 'New Zealand', ['Australia', 'Finland', 'Norway']),
    q('hard-firsts', 'Who was the first woman in space?', 'Valentina Tereshkova', ['Sally Ride', 'Svetlana Savitskaya', 'Mae Jemison']),
    q('hard-firsts', 'Which country hosted the first modern Olympic Games in 1896?', 'Greece', ['France', 'England', 'Italy']),

    // ── Inventions ─────────────────────────────
    q('hard-inventions', 'Who invented the World Wide Web?', 'Tim Berners-Lee', ['Vint Cerf', 'Bill Gates', 'Steve Jobs']),
    q('hard-inventions', 'Which civilisation invented paper?', 'China', ['Egypt', 'India', 'Persia']),
    q('hard-inventions', 'Who was granted the 1876 patent for the telephone?', 'Alexander Graham Bell', ['Thomas Edison', 'Nikola Tesla', 'Guglielmo Marconi']),
    q('hard-inventions', 'Who discovered penicillin in 1928?', 'Alexander Fleming', ['Louis Pasteur', 'Joseph Lister', 'Robert Koch']),
    q('hard-inventions', 'Philo Farnsworth is known as a pioneer of which invention?', 'Television', ['Radio', 'Telephone', 'Microwave']),
    q('hard-inventions', 'Which company made the DynaTAC, the first handheld mobile phone sold commercially?', 'Motorola', ['Nokia', 'Ericsson', 'Siemens']),

    // ── Odd one out ─────────────────────────────
    q('hard-odd-one-out', 'Which of these was NOT one of the Seven Wonders of the Ancient World?', 'Great Wall of China', ['Colossus of Rhodes', 'Lighthouse of Alexandria', 'Hanging Gardens of Babylon']),
    q('hard-odd-one-out', 'Which of these planets has no moons?', 'Venus', ['Mars', 'Neptune', 'Uranus']),
    q('hard-odd-one-out', 'Which of these is NOT a primary colour of light?', 'Yellow', ['Red', 'Green', 'Blue']),
    q('hard-odd-one-out', 'Which of these countries is NOT a member of the G7?', 'China', ['Italy', 'Canada', 'Japan']),
    q('hard-odd-one-out', 'Which of these is NOT a noble gas?', 'Nitrogen', ['Argon', 'Neon', 'Krypton']),
    q('hard-odd-one-out', 'Which of these countries does NOT share a border with Nigeria?', 'Ghana', ['Benin', 'Niger', 'Chad']),

    // ── Nigeria ─────────────────────────────
    q('hard-nigeria', 'In which year did Nigeria switch from driving on the left to the right?', '1972', ['1970', '1975', '1968']),
    q('hard-nigeria', "In which year did Abuja officially become Nigeria's capital?", '1991', ['1989', '1993', '1976']),
    q('hard-nigeria', 'Who designed the Nigerian flag?', 'Taiwo Akinkunmi', ['Ben Enwonwu', 'Herbert Macaulay', 'Benedict Odiase']),
    q('hard-nigeria', 'Who composed the music for the national anthem "Arise, O Compatriots"?', 'Benedict Odiase', ['Taiwo Akinkunmi', 'Fela Kuti', 'Sunny Okosuns']),
    q('hard-nigeria', 'In which year was the naira introduced to replace the Nigerian pound?', '1973', ['1971', '1975', '1969']),
    q('hard-nigeria', 'Which Nigerian state has the slogan "Centre of Excellence"?', 'Lagos', ['Ogun', 'Oyo', 'Rivers']),
    q('hard-nigeria', 'Which Nigerian state has the slogan "Coal City State"?', 'Enugu', ['Kogi', 'Anambra', 'Benue']),
    q('hard-nigeria', 'In which year was Things Fall Apart first published?', '1958', ['1960', '1956', '1962']),
    q('hard-nigeria', 'Which Chinua Achebe novel is the direct sequel to Things Fall Apart?', 'No Longer at Ease', ['Arrow of God', 'Anthills of the Savannah', 'A Man of the People']),

    // ── Acronyms ─────────────────────────────
    q('hard-acronyms', 'What does "SIM" in SIM card stand for?', 'Subscriber Identity Module', ['Secure Internet Module', 'System Identity Mobile', 'Subscriber Internet Mode']),
    q('hard-acronyms', 'What does "NYSC" stand for?', 'National Youth Service Corps', ['National Youth Service Council', 'National Youth Skills Corps', 'Nigerian Youth Service Corps']),
    q('hard-acronyms', 'What does "JAMB" stand for?', 'Joint Admissions and Matriculation Board', ['Joint Admissions and Matriculation Bureau', 'Junior Admissions and Matriculation Board', 'Joint Academic and Matriculation Board']),
    q('hard-acronyms', 'What did "NEPA" stand for?', 'National Electric Power Authority', ['Nigerian Electric Power Agency', 'National Energy Power Authority', 'National Electric Power Agency']),

    // ── World ─────────────────────────────
    q('hard-world', 'Which language has the most native speakers in the world?', 'Mandarin Chinese', ['Spanish', 'English', 'Hindi']),
    q('hard-world', 'What is the second-longest river in Africa?', 'Congo', ['Niger', 'Zambezi', 'Orange']),
    q('hard-world', 'What is the largest desert in the world, counting polar deserts?', 'Antarctic', ['Sahara', 'Arctic', 'Gobi']),
    q('hard-world', 'Which is the largest country in Africa by area?', 'Algeria', ['DR Congo', 'Sudan', 'Libya']),
    q('hard-world', 'Which country has the most ancient pyramids?', 'Sudan', ['Egypt', 'Mexico', 'Peru']),
    q('hard-world', 'Which is the only letter that does not appear in any US state name?', 'Q', ['Z', 'X', 'J']),
    q('hard-world', 'Which country gave the Statue of Liberty to the United States?', 'France', ['Britain', 'Spain', 'Italy']),
    q('hard-world', 'Which is the smallest of the world\'s oceans?', 'Arctic', ['Indian', 'Southern', 'Atlantic']),
    q('hard-world', 'Who painted the ceiling of the Sistine Chapel?', 'Michelangelo', ['Raphael', 'Leonardo da Vinci', 'Donatello']),

    // ── Science ─────────────────────────────
    q('hard-science', 'Which blood type is known as the universal donor?', 'O negative', ['AB positive', 'O positive', 'AB negative']),
    q('hard-science', 'As of 2023, which planet has the most confirmed moons?', 'Saturn', ['Jupiter', 'Uranus', 'Neptune']),
    q('hard-science', 'Which element has the chemical symbol Pb?', 'Lead', ['Platinum', 'Palladium', 'Phosphorus']),
    q('hard-science', 'Which element has the chemical symbol Fe?', 'Iron', ['Fluorine', 'Fermium', 'Francium']),
    q('hard-science', 'Which element has the chemical symbol Ag?', 'Silver', ['Gold', 'Argon', 'Aluminium']),
  ],
}
