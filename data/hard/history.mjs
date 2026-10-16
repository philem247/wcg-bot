// Hand-written hard history questions (2026-10). Plausible decoys,
// settled facts only, grouped by template so they spread across games.
const q = (template, text, correct, wrong) => ({ template, q: text, correct, wrong })

export const PACK = {
  category: 'history',
  questions: [
    // ── Africa ─────────────────────────────
    q('hard-africa', 'Which empire was ruled by Mansa Musa?', 'Mali', ['Songhai', 'Ghana', 'Kanem']),
    q('hard-africa', 'What was the capital of the Songhai Empire?', 'Gao', ['Timbuktu', 'Djenné', 'Niani']),
    q('hard-africa', 'Which 1591 battle against Morocco brought down the Songhai Empire?', 'Battle of Tondibi', ['Battle of Adwa', 'Battle of Isandlwana', 'Battle of Kirina']),
    q('hard-africa', 'Which country defeated Italy at the Battle of Adwa in 1896?', 'Ethiopia', ['Eritrea', 'Somalia', 'Sudan']),
    q('hard-africa', 'Which of these West African countries was never colonised?', 'Liberia', ['Ghana', 'Sierra Leone', 'Gambia']),
    q('hard-africa', 'Who was Africa\'s first elected female head of state?', 'Ellen Johnson Sirleaf', ['Joyce Banda', 'Sahle-Work Zewde', 'Samia Suluhu Hassan']),
    q('hard-africa', 'Which present-day country was formerly called Dahomey?', 'Benin', ['Togo', 'Burkina Faso', 'Niger']),
    q('hard-africa', 'Which present-day country was formerly called Upper Volta?', 'Burkina Faso', ['Mali', 'Niger', 'Chad']),
    q('hard-africa', 'Which present-day country was formerly called Southern Rhodesia?', 'Zimbabwe', ['Zambia', 'Malawi', 'Botswana']),
    q('hard-africa', 'In which year was the Organisation of African Unity founded?', '1963', ['1960', '1965', '1958']),
    q('hard-africa', 'In which year did the OAU become the African Union?', '2002', ['2000', '1999', '2004']),
    q('hard-africa', 'Which kingdom did Shaka lead?', 'Zulu', ['Xhosa', 'Ndebele', 'Sotho']),
    q('hard-africa', 'At which 1879 battle did the Zulu army defeat the British?', 'Isandlwana', ["Rorke's Drift", 'Ulundi', 'Blood River']),
    q('hard-africa', 'Which territory did King Leopold II rule as his personal property?', 'Congo Free State', ['German East Africa', 'French Equatorial Africa', 'Ruanda-Urundi']),
    q('hard-africa', 'In which year did the Berlin Conference on Africa open?', '1884', ['1878', '1890', '1899']),
    q('hard-africa', 'Who was the first UN Secretary-General from sub-Saharan Africa?', 'Kofi Annan', ['Boutros Boutros-Ghali', 'Ban Ki-moon', 'Javier Pérez de Cuéllar']),

    // ── World wars ─────────────────────────────
    q('hard-wars', 'Whose assassination in 1914 triggered the First World War?', 'Archduke Franz Ferdinand', ['Kaiser Wilhelm II', 'Tsar Nicholas II', 'King Umberto I']),
    q('hard-wars', 'Which treaty formally ended the First World War with Germany?', 'Treaty of Versailles', ['Treaty of Paris', 'Treaty of Ghent', 'Treaty of Utrecht']),
    q('hard-wars', 'Which city was hit by the second atomic bomb in 1945?', 'Nagasaki', ['Hiroshima', 'Kokura', 'Osaka']),
    q('hard-wars', 'Who was British Prime Minister when the Second World War began?', 'Neville Chamberlain', ['Winston Churchill', 'Stanley Baldwin', 'Clement Attlee']),
    q('hard-wars', 'Which US president was elected to four terms?', 'Franklin D. Roosevelt', ['Theodore Roosevelt', 'Woodrow Wilson', 'Harry S. Truman']),

    // ── Ancient world ─────────────────────────────
    q('hard-ancient', 'Who was the first Roman emperor?', 'Augustus', ['Julius Caesar', 'Nero', 'Caligula']),
    q('hard-ancient', 'In which year is the Western Roman Empire traditionally said to have fallen?', '476', ['410', '455', '527']),
    q('hard-ancient', 'In which year did Constantinople fall to the Ottomans?', '1453', ['1492', '1415', '1517']),
    q('hard-ancient', 'Whose tomb was discovered by Howard Carter in 1922?', 'Tutankhamun', ['Ramesses II', 'Akhenaten', 'Khufu']),
    q('hard-ancient', 'The Rosetta Stone was the key to decoding which script?', 'Egyptian hieroglyphs', ['Cuneiform', 'Linear B', 'Mayan glyphs']),
    q('hard-ancient', 'Which civilisation built Machu Picchu?', 'Inca', ['Aztec', 'Maya', 'Olmec']),

    // ── Explorers ─────────────────────────────
    q('hard-explorers', 'Who was the first European to reach India by sea?', 'Vasco da Gama', ['Bartolomeu Dias', 'Ferdinand Magellan', 'Christopher Columbus']),
    q('hard-explorers', 'Who was the first European to sail around the Cape of Good Hope?', 'Bartolomeu Dias', ['Vasco da Gama', 'Henry the Navigator', 'Diogo Cão']),
    q('hard-explorers', 'Whose expedition was the first to sail around the world?', 'Ferdinand Magellan', ['Vasco da Gama', 'Christopher Columbus', 'Francis Drake']),
    q('hard-explorers', 'In which year did the Titanic sink?', '1912', ['1910', '1914', '1908']),

    // ── Revolutions ─────────────────────────────
    q('hard-revolutions', 'In which year did the French Revolution begin?', '1789', ['1776', '1799', '1792']),
    q('hard-revolutions', 'Which French queen was executed in 1793?', 'Marie Antoinette', ["Catherine de' Medici", 'Joséphine', 'Marie Louise']),
    q('hard-revolutions', 'At which 1815 battle was Napoleon finally defeated?', 'Waterloo', ['Leipzig', 'Austerlitz', 'Trafalgar']),
    q('hard-revolutions', 'To which island was Napoleon exiled for the last time?', 'Saint Helena', ['Elba', 'Corsica', 'Malta']),
    q('hard-revolutions', "Who declared Haiti's independence in 1804?", 'Jean-Jacques Dessalines', ['Toussaint Louverture', 'Henri Christophe', 'Alexandre Pétion']),
    q('hard-revolutions', 'In which year did Britain abolish the transatlantic slave trade?', '1807', ['1833', '1792', '1815']),

    // ── Leaders ─────────────────────────────
    q('hard-leaders', "Who became the world's first female prime minister, in 1960?", 'Sirimavo Bandaranaike', ['Indira Gandhi', 'Golda Meir', 'Margaret Thatcher']),
    q('hard-leaders', 'Who was the first president of Ghana?', 'Kwame Nkrumah', ['Jerry Rawlings', 'Kofi Busia', 'John Kufuor']),
    q('hard-leaders', 'Who was the first president of Tanzania?', 'Julius Nyerere', ['Kenneth Kaunda', 'Ali Hassan Mwinyi', 'Milton Obote']),
    q('hard-leaders', 'Who was the first prime minister of the Democratic Republic of the Congo?', 'Patrice Lumumba', ['Joseph Kasa-Vubu', 'Mobutu Sese Seko', 'Moïse Tshombe']),
    q('hard-leaders', 'Who led Burkina Faso from 1983 until his assassination in 1987?', 'Thomas Sankara', ['Blaise Compaoré', 'Jerry Rawlings', 'Sékou Touré']),
    q('hard-leaders', 'Who was the first president of independent Senegal?', 'Léopold Sédar Senghor', ['Abdou Diouf', 'Abdoulaye Wade', 'Mamadou Dia']),
    q('hard-leaders', 'Who was the first president of Zambia?', 'Kenneth Kaunda', ['Frederick Chiluba', 'Levy Mwanawasa', 'Julius Nyerere']),
    q('hard-leaders', 'Who led Libya from 1969 until 2011?', 'Muammar Gaddafi', ['Hosni Mubarak', 'Gamal Abdel Nasser', 'Idi Amin']),
    q('hard-leaders', 'Which Egyptian leader nationalised the Suez Canal in 1956?', 'Gamal Abdel Nasser', ['Anwar Sadat', 'Hosni Mubarak', 'King Farouk']),
    q('hard-leaders', 'Who was the last Emperor of Ethiopia?', 'Haile Selassie', ['Menelik II', 'Tewodros II', 'Yohannes IV']),
    q('hard-leaders', 'Who led the 1930 Salt March against British rule in India?', 'Mahatma Gandhi', ['Jawaharlal Nehru', 'Subhas Chandra Bose', 'Muhammad Ali Jinnah']),
    q('hard-wars', 'In which year did India gain independence from Britain?', '1947', ['1945', '1950', '1948']),
    q('hard-wars', 'In which year did the Soviet Union dissolve?', '1991', ['1989', '1993', '1990']),
    q('hard-wars', 'In which year did the Rwandan genocide take place?', '1994', ['1992', '1996', '1990']),
  ],
}
