// Hand-written hard Nigerian entertainment questions (2026-10). Plausible
// decoys, settled facts only, grouped by template so they spread across games.
const q = (template, text, correct, wrong) => ({ template, q: text, correct, wrong })

export const PACK = {
  category: 'nigerian-entertainment',
  questions: [
    // ── Big Brother Naija ─────────────────────────────
    q('hard-bbnaija', 'Who won the first season of Big Brother Nigeria in 2006?', 'Katung Aduwak', ['Efe Ejeba', 'Miracle Ikechukwu', 'Laycon']),
    q('hard-bbnaija', 'Who won BBNaija season 2, "See Gobbe" (2017)?', 'Efe', ['Bisola', 'Tboss', 'Marvis']),
    q('hard-bbnaija', 'Who won BBNaija "Double Wahala" (2018)?', 'Miracle', ['Cee-C', 'Alex', 'Tobi']),
    q('hard-bbnaija', 'Who won BBNaija "Pepper Dem" (2019)?', 'Mercy Eke', ['Mike Edwards', 'Tacha', 'Frodd']),
    q('hard-bbnaija', 'Who won BBNaija "Lockdown" (2020)?', 'Laycon', ['Dorathy', 'Nengi', 'Neo']),
    q('hard-bbnaija', 'Who won BBNaija "Shine Ya Eye" (2021)?', 'Whitemoney', ['Liquorose', 'Pere', 'Angel']),
    q('hard-bbnaija', 'Who won BBNaija "Level Up" (2022)?', 'Phyna', ['Bella', 'Groovy', 'Sheggz']),
    q('hard-bbnaija', 'Who won BBNaija "All Stars" (2023)?', 'Ilebaye', ['Mercy Eke', 'Cee-C', 'Whitemoney']),
    q('hard-bbnaija', 'Who won BBNaija "No Loose Guard" (2024)?', 'Kellyrae', ['Wanni', 'Handi', 'Onyeka']),
    q('hard-bbnaija', 'Who has hosted Big Brother Naija since 2017?', 'Ebuka Obi-Uchendu', ['IK Osakioduwa', 'Toke Makinwa', 'Denrele Edun']),
    q('hard-bbnaija', 'Who was the first woman to win Big Brother Naija?', 'Mercy Eke', ['Phyna', 'Ilebaye', 'Cee-C']),
    q('hard-bbnaija', 'In which year did Big Brother Naija return after a long break since 2006?', '2017', ['2016', '2018', '2015']),
    q('hard-bbnaija', 'Before his BBNaija win, Laycon was best known as a what?', 'Rapper', ['Actor', 'Comedian', 'Chef']),

    // ── Comedy and skits ─────────────────────────────
    q('hard-comedy', 'What is the real name of the comedian Basketmouth?', 'Bright Okpocha', ['Ayo Makun', 'Atunyota Akpobome', 'Francis Agoda']),
    q('hard-comedy', 'Which comedian is widely called the father of Nigerian stand-up comedy?', 'Ali Baba', ['Basketmouth', 'Gordons', 'Okey Bakassi']),
    q('hard-comedy', "What is the name of Bright Okpocha's long-running stand-up show?", 'Basketmouth Uncensored', ['AY Live', 'Man on Fire', 'Night of a Thousand Laughs']),
    q('hard-comedy', 'Who created the comedy show "Night of a Thousand Laughs"?', 'Opa Williams', ['Ali Baba', 'Ayo Makun', 'Julius Agwu']),
    q('hard-comedy', 'Which skit maker plays the character "Mr Macaroni"?', 'Debo Adedayo', ['Bright Okpocha', 'Kie Kie', 'Sabinus']),
    q('hard-comedy', 'Which skit maker plays the strict mother "Aunty Ramota"?', 'Taaooma', ['Kie Kie', 'Maraji', 'Ashmusy']),
    q('hard-comedy', 'Which comic actor was known as "Baba Sala"?', 'Moses Olaiya', ['Adeyemi Afolayan', 'Jimoh Aliu', 'Babatunde Omidina']),

    // ── Nollywood stars ─────────────────────────────
    q('hard-nollywood', 'In which year was Omotola Jalade-Ekeinde named in TIME\'s 100 most influential people?', '2013', ['2011', '2015', '2009']),
    q('hard-nollywood', 'Which actor was famous as "Mr Ibu"?', 'John Okafor', ['Osita Iheme', 'Chinedu Ikedieze', 'Nkem Owoh']),
    q('hard-nollywood', 'In which year did Mr Ibu actor John Okafor die?', '2024', ['2023', '2022', '2021']),
    q('hard-nollywood', 'Which actress created and plays the character Jenifa?', 'Funke Akindele', ['Toyin Abraham', 'Mercy Johnson', 'Bimbo Thomas']),
    q('hard-nollywood', "Which veteran actor is Joke Silva's husband?", 'Olu Jacobs', ['Pete Edochie', 'Richard Mofe-Damijo', 'Kanayo O. Kanayo']),
    q('hard-nollywood', 'Who played Okonkwo in the 1987 TV adaptation of Things Fall Apart?', 'Pete Edochie', ['Nkem Owoh', 'Olu Jacobs', 'Sam Loco Efe']),
    q('hard-nollywood', 'Who directed Living in Bondage: Breaking Free (2019)?', 'Ramsey Nouah', ['Kenneth Okonkwo', 'Kunle Afolayan', 'Charles Okpaleke']),
    q('hard-nollywood', 'Which actress is popularly called "Mama G"?', 'Patience Ozokwor', ['Ngozi Ezeonu', 'Rita Edochie', 'Clarion Chukwura']),
    q('hard-nollywood', 'Which actress played Dr Ameyo Adadevoh in the Ebola drama 93 Days?', 'Bimbo Akintola', ['Joke Silva', 'Kate Henshaw', 'Omotola Jalade-Ekeinde']),
    q('hard-nollywood', 'Which actress played Moremi in the Netflix film Citation?', 'Temi Otedola', ['DJ Cuppy', 'Bisola Aiyeola', 'Ini Dima-Okojie']),
    q('hard-nollywood', 'Which Kunle Afolayan film features the mythical Akala bird?', 'Anikulapo', ['Citation', 'Mokalik', 'October 1']),
    q('hard-nollywood', 'Which pioneering filmmaker was known by the nickname "Ade Love"?', 'Adeyemi Afolayan', ['Hubert Ogunde', 'Moses Olaiya', 'Duro Ladipo']),
    q('hard-nollywood', 'Who is widely regarded as the father of Nigerian theatre?', 'Hubert Ogunde', ['Duro Ladipo', 'Wole Soyinka', 'Ola Rotimi']),
    q('hard-nollywood', 'Which Yoruba film actress is known as "Iya Awero"?', 'Lanre Hassan', ['Idowu Phillips', 'Bimbo Oshin', 'Toyin Abraham']),
    q('hard-nollywood', 'Which actress is known by the screen name "Mama Rainbow"?', 'Idowu Phillips', ['Lanre Hassan', 'Toyin Abraham', 'Ronke Oshodi-Oke']),
    q('hard-nollywood', 'In which year was the Living in Bondage sequel "Breaking Free" released?', '2019', ['2018', '2020', '2017']),

    // ── TV and streaming ─────────────────────────────
    q('hard-tv', 'Which station, launched in Ibadan in 1959, was the first TV station in Africa?', 'WNTV', ['NTA', 'ETV', 'RKTV']),
    q('hard-tv', 'Which classic NTA programme told folktales to children?', 'Tales by Moonlight', ['Super Story', 'Village Headmaster', 'Cock Crow at Dawn']),
    q('hard-tv', 'On which streaming platform was King of Boys: The Return of the King released?', 'Netflix', ['Amazon Prime', 'Showmax', 'iROKOtv']),
    q('hard-tv', 'Which streaming service did Jason Njoku found?', 'iROKOtv', ['Showmax', 'EbonyLife ON', 'Africa Magic']),
    q('hard-tv', 'Who founded EbonyLife TV?', 'Mo Abudu', ['Jason Njoku', 'Funke Akindele', 'Linda Ikeji']),
    q('hard-tv', 'Which 2022 drama was billed as the first Nigerian Netflix original series?', 'Blood Sisters', ['Shanty Town', 'Far From Home', 'Castle & Castle']),
    q('hard-tv', 'Which platform produced the web series "Skinny Girl in Transit"?', 'NdaniTV', ['EbonyLife TV', 'iROKOtv', 'Accelerate TV']),
    q('hard-tv', 'Which bank is behind the NdaniTV platform?', 'GTBank', ['Access Bank', 'Zenith Bank', 'First Bank']),
    q('hard-tv', 'Which long-running soap is set in the Nigerian film industry?', 'Tinsel', ['Super Story', 'Hush', 'Battleground']),
    q('hard-tv', 'Which game show did Frank Edoho famously host in Nigeria?', 'Who Wants to Be a Millionaire', ['The Weakest Link', 'Are You Smarter Than a 5th Grader', 'Deal or No Deal']),
    q('hard-tv', 'Which reality show launched the career of singer Iyanya?', 'Project Fame West Africa', ['Nigerian Idol', 'The Voice Nigeria', 'Glo X-Factor']),
    q('hard-tv', 'Which beer brand sponsored the survival reality show "Ultimate Search"?', 'Gulder', ['Star', 'Harp', 'Trophy']),

    q('hard-tv', 'Which TV talk show was hosted by Funmi Iyanda?', 'New Dawn', ['Moments with Mo', "Rubbin' Minds", 'The Spot']),
    q('hard-tv', 'Which Channels TV talk show does Ebuka Obi-Uchendu host?', "Rubbin' Minds", ['New Dawn', 'Moments with Mo', 'The Spot']),
    q('hard-comedy', 'Which actor plays "Saka" in the famous MTN adverts?', 'Hafiz Oyetoro', ['Babatunde Omidina', 'Nkem Owoh', 'Ime Bishop Umoh']),

    // ── Media and awards ─────────────────────────────
    q('hard-media', 'Who founded the Africa Movie Academy Awards (AMAA)?', 'Peace Anyiam-Osigwe', ['Mo Abudu', 'Jason Njoku', 'Ego Boyo']),
    q('hard-media', 'Who founded the media platform BellaNaija?', 'Uche Pedro', ['Linda Ikeji', 'Mo Abudu', 'Stella Dimoko Korkus']),
    q('hard-media', 'Which blogger started her famous Nigerian celebrity blog in 2006?', 'Linda Ikeji', ['Uche Pedro', 'Stella Dimoko Korkus', 'Toke Makinwa']),
    q('hard-media', "What is the name of Toke Makinwa's popular vlog?", 'Toke Moments', ['Toke Talks', 'Toke Tuesdays', 'Toke Diaries']),
  ],
}
