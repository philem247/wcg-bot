// Hand-written hard science questions (2026-10). Plausible decoys,
// settled facts only, grouped by template so they spread across games.
const q = (template, text, correct, wrong) => ({ template, q: text, correct, wrong })

export const PACK = {
  category: 'science',
  questions: [
    // ── Physics ─────────────────────────────
    q('hard-physics', 'In which year did Einstein publish his general theory of relativity?', '1915', ['1905', '1921', '1909']),
    q('hard-physics', 'For what did Einstein win his Nobel Prize?', 'The photoelectric effect', ['Relativity', 'Brownian motion', 'Mass-energy equivalence']),
    q('hard-physics', 'What is absolute zero in degrees Celsius?', '-273.15', ['-100', '-459.67', '-173.15']),
    q('hard-physics', 'At what temperature do the Celsius and Fahrenheit scales read the same?', '-40', ['0', '-32', '100']),
    q('hard-physics', 'In which of these does sound travel fastest?', 'Steel', ['Water', 'Air', 'A vacuum']),
    q('hard-physics', 'Which law says current through a conductor is proportional to the voltage?', "Ohm's law", ["Hooke's law", "Boyle's law", "Coulomb's law"]),
    q('hard-physics', 'Which law relates gas pressure and volume at constant temperature?', "Boyle's law", ["Charles's law", "Ohm's law", "Hooke's law"]),
    q('hard-physics', 'Roughly how long does sunlight take to reach Earth?', '8 minutes', ['8 seconds', '80 minutes', '8 hours']),
    q('hard-physics', 'Who discovered X-rays in 1895?', 'Wilhelm Röntgen', ['Henri Becquerel', 'Thomas Edison', 'Nikola Tesla']),
    q('hard-physics', 'Who discovered radioactivity in 1896?', 'Henri Becquerel', ['Marie Curie', 'Wilhelm Röntgen', 'Ernest Rutherford']),

    // ── Atoms and chemistry ─────────────────────────────
    q('hard-chemistry', 'Who discovered the electron?', 'J.J. Thomson', ['Ernest Rutherford', 'Niels Bohr', 'James Chadwick']),
    q('hard-chemistry', 'Who discovered the neutron?', 'James Chadwick', ['J.J. Thomson', 'Ernest Rutherford', 'Enrico Fermi']),
    q('hard-chemistry', "Whose gold foil experiment revealed the atom's nucleus?", 'Ernest Rutherford', ['J.J. Thomson', 'Niels Bohr', 'James Chadwick']),
    q('hard-chemistry', 'Who published the first widely recognised periodic table in 1869?', 'Dmitri Mendeleev', ['John Dalton', 'Antoine Lavoisier', 'Henry Moseley']),
    q('hard-chemistry', "Which is the most abundant element in Earth's crust?", 'Oxygen', ['Silicon', 'Aluminium', 'Iron']),
    q('hard-chemistry', 'Which is the only metal that is liquid at room temperature?', 'Mercury', ['Gallium', 'Caesium', 'Sodium']),
    q('hard-chemistry', 'Dry ice is the solid form of which substance?', 'Carbon dioxide', ['Nitrogen', 'Water', 'Methane']),
    q('hard-chemistry', 'Which gas is known as laughing gas?', 'Nitrous oxide', ['Nitrogen dioxide', 'Carbon monoxide', 'Methane']),
    q('hard-chemistry', 'What is the softest mineral on the Mohs scale?', 'Talc', ['Gypsum', 'Calcite', 'Graphite']),

    // ── Biology ─────────────────────────────
    q('hard-biology', 'Which organelle carries out photosynthesis?', 'Chloroplast', ['Mitochondrion', 'Ribosome', 'Vacuole']),
    q('hard-biology', 'How many chromosomes are in a normal human body cell?', '46', ['44', '48', '23']),
    q('hard-biology', 'Which part of the brain mainly controls balance and coordination?', 'Cerebellum', ['Cerebrum', 'Medulla', 'Hypothalamus']),
    q('hard-biology', 'What is the largest organ of the human body?', 'Skin', ['Liver', 'Lungs', 'Brain']),
    q('hard-biology', 'A lack of vitamin C causes which disease?', 'Scurvy', ['Rickets', 'Beriberi', 'Pellagra']),
    q('hard-biology', 'A lack of vitamin D in children causes which disease?', 'Rickets', ['Scurvy', 'Beriberi', 'Goitre']),
    q('hard-biology', 'Who proposed evolution by natural selection at the same time as Darwin?', 'Alfred Russel Wallace', ['Gregor Mendel', 'Jean-Baptiste Lamarck', 'Thomas Huxley']),
    q('hard-biology', 'Who is known as the father of genetics?', 'Gregor Mendel', ['Charles Darwin', 'James Watson', 'Louis Pasteur']),
    q('hard-biology', 'Whose X-ray image "Photo 51" was key to discovering the structure of DNA?', 'Rosalind Franklin', ['Maurice Wilkins', 'Linus Pauling', 'Barbara McClintock']),
    q('hard-biology', 'What is the most common blood type in the world?', 'O positive', ['A positive', 'B positive', 'AB positive']),
    q('hard-biology', 'Which organ produces insulin?', 'Pancreas', ['Liver', 'Kidney', 'Spleen']),
    q('hard-biology', 'What is the scientific study of fungi called?', 'Mycology', ['Phycology', 'Virology', 'Bryology']),
    q('hard-biology', 'What is the scientific study of birds called?', 'Ornithology', ['Entomology', 'Herpetology', 'Ichthyology']),

    // ── Space ─────────────────────────────
    q('hard-space', 'What is the closest star to Earth after the Sun?', 'Proxima Centauri', ['Sirius', 'Alpha Centauri A', 'Betelgeuse']),
    q('hard-space', 'Which planet takes longest to spin once on its axis?', 'Venus', ['Mercury', 'Jupiter', 'Mars']),
    q('hard-space', 'Which planet is tilted so far that it spins on its side?', 'Uranus', ['Neptune', 'Saturn', 'Venus']),
    q('hard-space', 'What is the largest moon in the solar system?', 'Ganymede', ['Titan', 'Callisto', 'Io']),
    q('hard-space', 'Which moon has a thick, nitrogen-rich atmosphere?', 'Titan', ['Europa', 'Ganymede', 'Io']),
    q('hard-space', 'Who published the Sun-centred model of the solar system in 1543?', 'Nicolaus Copernicus', ['Galileo Galilei', 'Johannes Kepler', 'Tycho Brahe']),
    q('hard-space', 'Which planet has the Great Red Spot?', 'Jupiter', ['Saturn', 'Mars', 'Neptune']),
    q('hard-space', 'Which dwarf planet was reclassified from planet status in 2006?', 'Pluto', ['Ceres', 'Eris', 'Makemake']),
    q('hard-space', 'What was the first artificial satellite, launched in 1957?', 'Sputnik 1', ['Explorer 1', 'Vostok 1', 'Telstar 1']),
    q('hard-space', 'Which space telescope was launched in December 2021?', 'James Webb', ['Hubble', 'Kepler', 'Spitzer']),
    q('hard-chemistry', 'What is the chemical formula of ozone?', 'O3', ['O2', 'CO2', 'H2O2']),
    q('hard-chemistry', 'Which is the most electronegative element?', 'Fluorine', ['Oxygen', 'Chlorine', 'Nitrogen']),
    q('hard-chemistry', 'Which noble gas gives classic advertising signs their red-orange glow?', 'Neon', ['Argon', 'Xenon', 'Krypton']),
    q('hard-chemistry', 'Roughly what is the half-life of carbon-14?', '5,730 years', ['1,600 years', '24,000 years', '50,000 years']),
    q('hard-physics', 'Which physicist is known for the uncertainty principle?', 'Werner Heisenberg', ['Erwin Schrödinger', 'Max Planck', 'Niels Bohr']),
    q('hard-physics', 'Who introduced the idea of energy quanta in 1900?', 'Max Planck', ['Albert Einstein', 'Niels Bohr', 'Werner Heisenberg']),
    q('hard-physics', "Whose oil-drop experiment measured the electron's charge?", 'Robert Millikan', ['J.J. Thomson', 'Michael Faraday', 'Ernest Rutherford']),
    q('hard-physics', 'What is the SI unit of radioactive activity?', 'Becquerel', ['Sievert', 'Gray', 'Curie']),
    q('hard-biology', 'Which part of the eye adjusts how much light gets in?', 'Iris', ['Pupil', 'Retina', 'Cornea']),
    q('hard-biology', 'Which gland is often called the master gland?', 'Pituitary', ['Thyroid', 'Adrenal', 'Pineal']),
  ],
}
