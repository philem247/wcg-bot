// Hand-written hard health questions (2026-10). Plausible decoys,
// settled facts only, grouped by template so they spread across games.
const q = (template, text, correct, wrong) => ({ template, q: text, correct, wrong })

export const PACK = {
  category: 'health',
  questions: [
    // ── Vitamins and nutrition ─────────────────────────────
    q('hard-nutrition', 'Which vitamin helps the blood to clot?', 'Vitamin K', ['Vitamin C', 'Vitamin B12', 'Vitamin E']),
    q('hard-nutrition', 'A lack of iodine causes which condition?', 'Goitre', ['Rickets', 'Scurvy', 'Anaemia']),
    q('hard-nutrition', 'A lack of vitamin B1 (thiamine) causes which disease?', 'Beriberi', ['Pellagra', 'Scurvy', 'Rickets']),
    q('hard-nutrition', 'A lack of niacin (vitamin B3) causes which disease?', 'Pellagra', ['Beriberi', 'Scurvy', 'Rickets']),
    q('hard-nutrition', 'A lack of vitamin A can lead to which condition?', 'Night blindness', ['Rickets', 'Scurvy', 'Goitre']),
    q('hard-nutrition', 'Which mineral deficiency is the most common cause of anaemia?', 'Iron', ['Calcium', 'Zinc', 'Magnesium']),
    q('hard-nutrition', 'Which vitamin is also called ascorbic acid?', 'Vitamin C', ['Vitamin A', 'Vitamin B12', 'Vitamin D']),
    q('hard-nutrition', 'Which vitamin is also called retinol?', 'Vitamin A', ['Vitamin D', 'Vitamin E', 'Vitamin K']),
    q('hard-nutrition', 'Cobalamin is another name for which vitamin?', 'Vitamin B12', ['Vitamin B6', 'Vitamin B1', 'Vitamin B9']),
    q('hard-nutrition', 'Folic acid is a form of which vitamin?', 'Vitamin B9', ['Vitamin B12', 'Vitamin B6', 'Vitamin B2']),
    q('hard-nutrition', 'In adults, a BMI of 30 or more is classed as what?', 'Obese', ['Overweight', 'Normal', 'Underweight']),
    q('hard-nutrition', 'What does BMI stand for?', 'Body Mass Index', ['Body Muscle Index', 'Basal Metabolic Index', 'Body Measurement Index']),

    // ── Diseases ─────────────────────────────
    q('hard-diseases', 'Which mosquito genus transmits malaria?', 'Anopheles', ['Aedes', 'Culex', 'Mansonia']),
    q('hard-diseases', 'Which mosquito genus spreads dengue and yellow fever?', 'Aedes', ['Anopheles', 'Culex', 'Mansonia']),
    q('hard-diseases', 'Which parasite causes malaria?', 'Plasmodium', ['Trypanosoma', 'Leishmania', 'Giardia']),
    q('hard-diseases', 'Sleeping sickness is spread by which insect?', 'Tsetse fly', ['Sandfly', 'Blackfly', 'Housefly']),
    q('hard-diseases', 'River blindness is spread by which insect?', 'Blackfly', ['Tsetse fly', 'Sandfly', 'Housefly']),
    q('hard-diseases', 'Lassa fever is mainly spread by which animals?', 'Rats', ['Bats', 'Mosquitoes', 'Ticks']),
    q('hard-diseases', 'In which present-day Nigerian state was Lassa fever first identified in 1969?', 'Borno', ['Lagos', 'Kano', 'Plateau']),
    q('hard-diseases', 'In which year was Nigeria certified free of wild polio?', '2020', ['2018', '2016', '2022']),
    q('hard-diseases', 'What kind of germ causes tuberculosis?', 'A bacterium', ['A virus', 'A fungus', 'A parasite']),
    q('hard-diseases', 'Which genotype does a person with sickle cell anaemia have?', 'SS', ['AS', 'AA', 'AC']),
    q('hard-diseases', 'Which parent pairing gives the highest chance of a child with sickle cell anaemia?', 'AS and AS', ['AA and AS', 'AA and AA', 'AA and SS']),
    q('hard-diseases', 'Which type of diabetes is an autoimmune disease?', 'Type 1', ['Type 2', 'Gestational', 'Prediabetes']),
    q('hard-diseases', 'What does tachycardia mean?', 'A fast heart rate', ['A slow heart rate', 'Low blood pressure', 'A blocked artery']),

    // ── Vaccines and pioneers ─────────────────────────────
    q('hard-pioneers', 'Edward Jenner developed the first vaccine against which disease?', 'Smallpox', ['Polio', 'Rabies', 'Measles']),
    q('hard-pioneers', 'Who developed the first rabies vaccine?', 'Louis Pasteur', ['Edward Jenner', 'Robert Koch', 'Alexander Fleming']),
    q('hard-pioneers', 'Who developed the first widely used polio vaccine in 1955?', 'Jonas Salk', ['Albert Sabin', 'Louis Pasteur', 'Edward Jenner']),
    q('hard-pioneers', 'Which disease did the WHO declare eradicated in 1980?', 'Smallpox', ['Polio', 'Measles', 'Guinea worm']),
    q('hard-pioneers', 'Who identified the bacterium that causes tuberculosis in 1882?', 'Robert Koch', ['Louis Pasteur', 'Joseph Lister', 'Paul Ehrlich']),
    q('hard-pioneers', 'Which surgeon pioneered antiseptic surgery using carbolic acid?', 'Joseph Lister', ['Robert Koch', 'Ignaz Semmelweis', 'John Snow']),

    // ── The body ─────────────────────────────
    q('hard-body', 'What is the normal resting heart rate for an adult?', '60-100 bpm', ['40-60 bpm', '100-140 bpm', '30-50 bpm']),
    q('hard-body', 'Which organ produces bile?', 'Liver', ['Gallbladder', 'Pancreas', 'Stomach']),
    q('hard-body', 'Where in the body is bile stored?', 'Gallbladder', ['Liver', 'Pancreas', 'Duodenum']),
    q('hard-body', 'What is the medical name for the collarbone?', 'Clavicle', ['Scapula', 'Sternum', 'Patella']),
    q('hard-body', 'What is the medical name for the kneecap?', 'Patella', ['Clavicle', 'Tibia', 'Fibula']),
    q('hard-body', 'Roughly how much blood does an average adult have?', 'About 5 litres', ['About 2 litres', 'About 8 litres', 'About 10 litres']),
    q('hard-body', 'Which blood group can receive blood from every group?', 'AB positive', ['O negative', 'A positive', 'B negative']),
    q('hard-body', 'Which hormone is best known as the stress hormone?', 'Cortisol', ['Insulin', 'Melatonin', 'Oxytocin']),
    q('hard-body', 'Which hormone helps regulate sleep?', 'Melatonin', ['Cortisol', 'Serotonin', 'Adrenaline']),
    q('hard-body', 'What is the largest artery in the human body?', 'Aorta', ['Carotid artery', 'Femoral artery', 'Pulmonary artery']),
    q('hard-body', 'Which protein in red blood cells carries oxygen?', 'Haemoglobin', ['Myoglobin', 'Albumin', 'Fibrinogen']),
    q('hard-body', 'What is the medical name for the voice box?', 'Larynx', ['Pharynx', 'Trachea', 'Epiglottis']),
    q('hard-body', 'Which part of the body contains the alveoli?', 'Lungs', ['Kidneys', 'Liver', 'Intestines']),
    q('hard-body', 'Which organ contains the nephrons that filter blood?', 'Kidney', ['Liver', 'Spleen', 'Pancreas']),
    q('hard-body', 'Which blood cells help the blood to clot?', 'Platelets', ['Red blood cells', 'White blood cells', 'Plasma cells']),
    q('hard-body', 'Which part of the eye is the coloured ring?', 'Iris', ['Pupil', 'Cornea', 'Lens']),
    q('hard-body', 'Which joint connects the jaw to the skull?', 'Temporomandibular joint', ['Atlanto-occipital joint', 'Sternoclavicular joint', 'Acromioclavicular joint']),
    q('hard-diseases', "What is the medical term for too little oxygen reaching the body's tissues?", 'Hypoxia', ['Hypoglycaemia', 'Hypotension', 'Anaemia']),
    q('hard-pioneers', 'The BCG vaccine protects against which disease?', 'Tuberculosis', ['Polio', 'Measles', 'Tetanus']),
  ],
}
