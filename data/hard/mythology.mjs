// Hand-written hard mythology questions (2026-10). Plausible decoys,
// settled facts only, grouped by template so they spread across games.
const q = (template, text, correct, wrong) => ({ template, q: text, correct, wrong })

export const PACK = {
  category: 'mythology',
  questions: [
    // ── Greek heroes ─────────────────────────────
    q('hard-greek-heroes', 'Who ferried the souls of the dead across the river Styx?', 'Charon', ['Hermes', 'Thanatos', 'Cerberus']),
    q('hard-greek-heroes', 'How many heads is Cerberus usually said to have?', 'Three', ['Two', 'Five', 'Nine']),
    q('hard-greek-heroes', 'Who was the mother of Achilles?', 'Thetis', ['Hera', 'Athena', 'Leda']),
    q('hard-greek-heroes', 'Who killed Achilles with an arrow?', 'Paris', ['Hector', 'Agamemnon', 'Odysseus']),
    q('hard-greek-heroes', 'Who gave Theseus the thread to find his way out of the labyrinth?', 'Ariadne', ['Phaedra', 'Medea', 'Andromeda']),
    q('hard-greek-heroes', 'Who built the labyrinth of Crete?', 'Daedalus', ['Icarus', 'Minos', 'Hephaestus']),
    q('hard-greek-heroes', "What was the name of Jason's ship?", 'The Argo', ['The Arcadia', 'The Hermes', 'The Pegasus']),
    q('hard-greek-heroes', 'How many labours did Heracles perform?', 'Twelve', ['Ten', 'Seven', 'Nine']),
    q('hard-greek-heroes', 'After the Trojan War, how many years did it take Odysseus to get home?', 'Ten', ['Seven', 'Twenty', 'Five']),
    q('hard-greek-heroes', "Who was Odysseus's faithful wife?", 'Penelope', ['Helen', 'Andromache', 'Circe']),
    q('hard-greek-heroes', 'Which one-eyed giant did Odysseus blind?', 'Polyphemus', ['Argus', 'Talos', 'Antaeus']),

    // ── Greek and Roman gods ─────────────────────────────
    q('hard-greek-gods', "What was left inside Pandora's jar after the evils escaped?", 'Hope', ['Fear', 'Greed', 'Love']),
    q('hard-greek-gods', "Which bird ate Prometheus's liver every day?", 'An eagle', ['A vulture', 'A raven', 'A hawk']),
    q('hard-greek-gods', 'Which Titan was condemned to hold up the sky?', 'Atlas', ['Cronus', 'Hyperion', 'Oceanus']),
    q('hard-greek-gods', 'Who was the father of Zeus?', 'Cronus', ['Uranus', 'Atlas', 'Hyperion']),
    q('hard-greek-gods', 'Which goddess was born from the sea foam?', 'Aphrodite', ['Athena', 'Hera', 'Persephone']),
    q('hard-greek-gods', 'Eating the seeds of which fruit bound Persephone to the underworld?', 'Pomegranate', ['Apple', 'Fig', 'Grape']),
    q('hard-greek-gods', 'Who was the Greek goddess of victory?', 'Nike', ['Nemesis', 'Tyche', 'Eris']),
    q('hard-greek-gods', 'Which goddess threw the golden apple marked "to the fairest"?', 'Eris', ['Nemesis', 'Hera', 'Athena']),
    q('hard-greek-gods', 'What is the Roman name for Hephaestus?', 'Vulcan', ['Mars', 'Neptune', 'Saturn']),
    q('hard-greek-gods', 'What is the Roman name for Artemis?', 'Diana', ['Minerva', 'Juno', 'Vesta']),
    q('hard-greek-gods', 'What is the Roman name for Athena?', 'Minerva', ['Diana', 'Juno', 'Ceres']),
    q('hard-greek-gods', 'What is the Roman name for Hermes?', 'Mercury', ['Mars', 'Vulcan', 'Janus']),

    // ── Norse ─────────────────────────────
    q('hard-norse', 'Which giant wolf kills Odin at Ragnarök?', 'Fenrir', ['Sköll', 'Garmr', 'Hati']),
    q('hard-norse', 'What is the name of the world tree that links the nine realms?', 'Yggdrasil', ['Bifröst', 'Ginnungagap', 'Asgard']),
    q('hard-norse', 'What is the name of the rainbow bridge to Asgard?', 'Bifröst', ['Yggdrasil', 'Valhalla', 'Midgard']),
    q('hard-norse', 'Which child of Loki is the serpent that encircles Midgard?', 'Jörmungandr', ['Fenrir', 'Níðhöggr', 'Hel']),
    q('hard-norse', 'To which hall does Odin bring half of the warriors slain in battle?', 'Valhalla', ['Fólkvangr', 'Helheim', 'Gladsheim']),
    q('hard-norse', 'Which god was killed by a dart of mistletoe?', 'Baldr', ['Höðr', 'Tyr', 'Freyr']),
    q('hard-norse', 'Which god lost his hand to the wolf Fenrir?', 'Tyr', ['Thor', 'Heimdall', 'Vidar']),
    q('hard-norse', 'Which god guards the Bifröst bridge?', 'Heimdall', ['Tyr', 'Baldr', 'Freyr']),

    // ── Egyptian ─────────────────────────────
    q('hard-egyptian', 'Which Egyptian god has the head of a jackal?', 'Anubis', ['Horus', 'Thoth', 'Sobek']),
    q('hard-egyptian', 'Which Egyptian god has the head of an ibis?', 'Thoth', ['Horus', 'Anubis', 'Khnum']),
    q('hard-egyptian', 'Which Egyptian god has the head of a crocodile?', 'Sobek', ['Thoth', 'Anubis', 'Khnum']),
    q('hard-egyptian', 'Who murdered Osiris?', 'Set', ['Horus', 'Anubis', 'Ra']),
    q('hard-egyptian', 'Who was the wife of Osiris?', 'Isis', ['Nephthys', 'Hathor', 'Bastet']),
    q('hard-egyptian', 'Which Egyptian goddess was shown with the head of a cat?', 'Bastet', ['Sekhmet', 'Hathor', 'Nut']),
    q('hard-egyptian', 'Which Egyptian goddess is the sky, arching over the earth?', 'Nut', ['Geb', 'Isis', 'Hathor']),

    // ── African ─────────────────────────────
    q('hard-african', 'Which orisha is the Yoruba god of iron and war?', 'Ogun', ['Sango', 'Oya', 'Osun']),
    q('hard-african', 'Which orisha, a wife of Sango, rules the winds and storms?', 'Oya', ['Osun', 'Yemoja', 'Oba']),
    q('hard-african', 'Which orisha is the trickster and divine messenger?', 'Esu', ['Ogun', 'Orunmila', 'Obatala']),
    q('hard-african', 'Which orisha is linked to Ifá divination and wisdom?', 'Orunmila', ['Esu', 'Obatala', 'Sango']),
    q('hard-african', 'Which orisha moulded human bodies from clay?', 'Obatala', ['Olodumare', 'Orunmila', 'Ogun']),
    q('hard-african', 'The trickster spider Anansi comes from the folklore of which people?', 'Akan', ['Yoruba', 'Zulu', 'Igbo']),
    q('hard-african', 'Who is the Igbo earth goddess?', 'Ala', ['Amadioha', 'Chukwu', 'Ikenga']),
    q('hard-african', 'Amadioha is the Igbo god of what?', 'Thunder', ['Earth', 'Rivers', 'War']),

    // ── Hindu and others ─────────────────────────────
    q('hard-world-myth', 'Which monkey god helps Rama rescue Sita?', 'Hanuman', ['Garuda', 'Ganesha', 'Krishna']),
    q('hard-world-myth', 'Which feathered serpent was a major god of the Aztecs?', 'Quetzalcoatl', ['Tlaloc', 'Huitzilopochtli', 'Tezcatlipoca']),
    q('hard-world-myth', 'In Mesopotamian myth, who is the hero-king of Uruk in the oldest surviving epic?', 'Gilgamesh', ['Enkidu', 'Marduk', 'Sargon']),
    q('hard-world-myth', 'Which Japanese sun goddess hid in a cave and plunged the world into darkness?', 'Amaterasu', ['Izanami', 'Inari', 'Benzaiten']),
  ],
}
