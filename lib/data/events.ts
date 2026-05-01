import type { HistoricalEvent } from "./types";

/**
 * A starter set of major world-history events. Curated for breadth, not
 * depth — extend freely. Dates are best-effort traditional/conventional.
 */
export const EVENTS: HistoricalEvent[] = [
  // ── Ancient ────────────────────────────────────────────────────────────
  {
    id: "egypt-unified",
    year: -3100,
    title: "Unification of Egypt",
    description:
      "Narmer (Menes) traditionally credited with uniting Upper and Lower Egypt, founding the First Dynasty.",
    era: "ancient",
  },
  {
    id: "pyramid-giza",
    year: -2560,
    title: "Great Pyramid of Giza",
    description:
      "The pyramid of Khufu completed — the tallest human-made structure on Earth for ~3,800 years.",
    era: "ancient",
  },
  {
    id: "hammurabi",
    year: -1754,
    title: "Code of Hammurabi",
    description:
      "Babylonian king Hammurabi promulgates one of the earliest surviving written legal codes.",
    era: "ancient",
  },
  {
    id: "bronze-collapse",
    year: -1177,
    title: "Bronze Age Collapse",
    description:
      "A coordinated wave of invasions, migrations and systems failure ends the great Bronze Age civilisations of the eastern Mediterranean.",
    era: "ancient",
  },
  {
    id: "olympics-first",
    year: -776,
    title: "First Olympic Games",
    description:
      "Traditional date of the first Olympic Games at Olympia — used by later Greeks as a chronological anchor.",
    era: "ancient",
  },
  {
    id: "rome-founded",
    year: -753,
    title: "Founding of Rome",
    description:
      "Traditional date of Romulus founding the city of Rome on the Palatine Hill.",
    era: "ancient",
  },
  {
    id: "cyrus-babylon",
    year: -539,
    title: "Cyrus the Great takes Babylon",
    description:
      "The Achaemenid Persian Empire becomes the largest the world had yet seen.",
    era: "ancient",
  },

  // ── Classical ──────────────────────────────────────────────────────────
  {
    id: "marathon",
    year: -490,
    title: "Battle of Marathon",
    description:
      "Athenian-led Greeks defeat the first Persian invasion under Darius I.",
    era: "classical",
  },
  {
    id: "thermopylae",
    year: -480,
    title: "Battle of Thermopylae",
    description:
      "Leonidas and a small Greek force hold the pass against Xerxes' invasion before being overwhelmed.",
    era: "classical",
  },
  {
    id: "peloponnesian-war",
    year: -431,
    title: "Peloponnesian War begins",
    description:
      "Athens and Sparta enter the long conflict that ends the golden age of classical Athens.",
    era: "classical",
  },
  {
    id: "alexander",
    year: -336,
    title: "Alexander the Great accedes",
    description:
      "Alexander inherits Macedon and within a decade conquers Persia, reaching the Indus.",
    era: "classical",
  },
  {
    id: "qin-unifies",
    year: -221,
    title: "Qin unifies China",
    description:
      "Qin Shi Huang declares himself First Emperor, founding imperial China.",
    era: "classical",
  },
  {
    id: "punic-end",
    year: -146,
    title: "Destruction of Carthage",
    description:
      "Rome razes Carthage at the close of the Third Punic War, becoming undisputed master of the western Mediterranean.",
    era: "classical",
  },
  {
    id: "caesar-assassinated",
    year: -44,
    month: 3,
    day: 15,
    title: "Assassination of Julius Caesar",
    description:
      "Caesar stabbed in the Senate on the Ides of March; the Republic's death throes accelerate.",
    era: "classical",
  },
  {
    id: "augustus",
    year: -27,
    title: "Augustus becomes first Emperor",
    description:
      "Octavian receives the title Augustus, marking the conventional start of the Roman Empire.",
    era: "classical",
  },
  {
    id: "vesuvius",
    year: 79,
    month: 8,
    day: 24,
    title: "Eruption of Vesuvius",
    description:
      "Pompeii and Herculaneum buried — and preserved — by a Plinian eruption.",
    era: "classical",
  },
  {
    id: "edict-milan",
    year: 313,
    title: "Edict of Milan",
    description:
      "Constantine and Licinius grant religious tolerance across the Roman Empire, ending state persecution of Christians.",
    era: "classical",
  },
  {
    id: "sack-rome-410",
    year: 410,
    title: "Sack of Rome",
    description:
      "Alaric's Visigoths sack the city — the first time Rome had fallen to a foreign enemy in nearly 800 years.",
    era: "classical",
  },
  {
    id: "fall-west-rome",
    year: 476,
    title: "Fall of the Western Roman Empire",
    description:
      "Odoacer deposes Romulus Augustulus; conventional end-date of antiquity in the west.",
    era: "classical",
  },

  // ── Medieval ───────────────────────────────────────────────────────────
  {
    id: "hijra",
    year: 622,
    title: "The Hijra",
    description:
      "Muhammad's migration from Mecca to Medina — year one of the Islamic calendar.",
    era: "medieval",
  },
  {
    id: "tours",
    year: 732,
    title: "Battle of Tours",
    description:
      "Charles Martel checks the Umayyad advance into Frankish Gaul.",
    era: "medieval",
  },
  {
    id: "charlemagne",
    year: 800,
    month: 12,
    day: 25,
    title: "Charlemagne crowned Emperor",
    description:
      "Pope Leo III crowns Charlemagne in Rome on Christmas Day, reviving the idea of a western empire.",
    era: "medieval",
  },
  {
    id: "norman-conquest",
    year: 1066,
    month: 10,
    day: 14,
    title: "Norman Conquest",
    description:
      "William the Conqueror defeats Harold Godwinson at Hastings, transforming England.",
    era: "medieval",
  },
  {
    id: "first-crusade",
    year: 1095,
    title: "First Crusade declared",
    description:
      "Urban II's call at Clermont launches centuries of Latin Christian expeditions to the Levant.",
    era: "medieval",
  },
  {
    id: "magna-carta",
    year: 1215,
    month: 6,
    day: 15,
    title: "Magna Carta",
    description:
      "King John of England seals the charter at Runnymede, constraining royal authority by law.",
    era: "medieval",
  },
  {
    id: "black-death",
    year: 1347,
    title: "Black Death reaches Europe",
    description:
      "Yersinia pestis arrives via Genoese ships at Messina, killing perhaps a third of Europe over the following years.",
    era: "medieval",
  },
  {
    id: "fall-constantinople",
    year: 1453,
    month: 5,
    day: 29,
    title: "Fall of Constantinople",
    description:
      "Mehmed II's Ottomans take the Byzantine capital, ending the Roman Empire after 1,500 years.",
    era: "medieval",
  },
  {
    id: "columbus-1492",
    year: 1492,
    month: 10,
    day: 12,
    title: "Columbus reaches the Americas",
    description:
      "European-American contact resumes with profound consequences for both hemispheres.",
    era: "medieval",
  },

  // ── Early Modern ───────────────────────────────────────────────────────
  {
    id: "ninety-five-theses",
    year: 1517,
    month: 10,
    day: 31,
    title: "Luther's 95 Theses",
    description:
      "Martin Luther's challenge to indulgences ignites the Protestant Reformation.",
    era: "early-modern",
  },
  {
    id: "armada",
    year: 1588,
    title: "Spanish Armada defeated",
    description:
      "Elizabethan England survives Philip II's invasion fleet — a turning point in Atlantic power.",
    era: "early-modern",
  },
  {
    id: "jamestown",
    year: 1607,
    title: "Jamestown founded",
    description:
      "First permanent English settlement in North America established in Virginia.",
    era: "early-modern",
  },
  {
    id: "westphalia",
    year: 1648,
    title: "Peace of Westphalia",
    description:
      "Ends the Thirty Years' War and is conventionally taken to inaugurate the modern state system.",
    era: "early-modern",
  },
  {
    id: "principia",
    year: 1687,
    title: "Newton's Principia",
    description:
      "Isaac Newton publishes the Philosophiae Naturalis Principia Mathematica.",
    era: "early-modern",
  },
  {
    id: "us-independence",
    year: 1776,
    month: 7,
    day: 4,
    title: "American Declaration of Independence",
    description:
      "The thirteen colonies declare separation from Great Britain.",
    era: "early-modern",
  },
  {
    id: "french-revolution",
    year: 1789,
    month: 7,
    day: 14,
    title: "Storming of the Bastille",
    description:
      "Conventional start of the French Revolution.",
    era: "early-modern",
  },
  {
    id: "napoleon-power",
    year: 1799,
    month: 11,
    day: 9,
    title: "Napoleon seizes power",
    description:
      "The 18 Brumaire coup ends the Directory and brings Napoleon to the head of France.",
    era: "early-modern",
  },

  // ── Modern ─────────────────────────────────────────────────────────────
  {
    id: "waterloo",
    year: 1815,
    month: 6,
    day: 18,
    title: "Battle of Waterloo",
    description:
      "Wellington and Blücher decisively defeat Napoleon, ending the Napoleonic Wars.",
    era: "modern",
  },
  {
    id: "origin-species",
    year: 1859,
    month: 11,
    day: 24,
    title: "Origin of Species published",
    description:
      "Charles Darwin's On the Origin of Species sets out evolution by natural selection.",
    era: "modern",
  },
  {
    id: "us-civil-war-end",
    year: 1865,
    month: 4,
    day: 9,
    title: "End of the US Civil War",
    description:
      "Lee surrenders to Grant at Appomattox Court House.",
    era: "modern",
  },
  {
    id: "german-unification",
    year: 1871,
    month: 1,
    day: 18,
    title: "Unification of Germany",
    description:
      "Wilhelm I proclaimed Emperor of a unified Germany at Versailles.",
    era: "modern",
  },
  {
    id: "ww1-begins",
    year: 1914,
    month: 7,
    day: 28,
    title: "First World War begins",
    description:
      "Austria-Hungary declares war on Serbia; the great powers tumble into a global conflict.",
    era: "modern",
  },
  {
    id: "russian-revolution",
    year: 1917,
    month: 11,
    day: 7,
    title: "Russian Revolution",
    description:
      "The October Revolution brings the Bolsheviks to power.",
    era: "modern",
  },
  {
    id: "wall-street-crash",
    year: 1929,
    month: 10,
    day: 29,
    title: "Wall Street Crash",
    description:
      "Black Tuesday — the start of the Great Depression.",
    era: "modern",
  },
  {
    id: "ww2-begins",
    year: 1939,
    month: 9,
    day: 1,
    title: "Second World War begins",
    description:
      "Germany invades Poland; Britain and France declare war days later.",
    era: "modern",
  },
  {
    id: "ww2-ends",
    year: 1945,
    month: 8,
    day: 15,
    title: "End of the Second World War",
    description:
      "Japan surrenders following the atomic bombings of Hiroshima and Nagasaki.",
    era: "modern",
  },

  // ── Contemporary ───────────────────────────────────────────────────────
  {
    id: "indian-independence",
    year: 1947,
    month: 8,
    day: 15,
    title: "Indian independence and partition",
    description:
      "British India is partitioned into the independent dominions of India and Pakistan.",
    era: "contemporary",
  },
  {
    id: "prc-founded",
    year: 1949,
    month: 10,
    day: 1,
    title: "People's Republic of China founded",
    description:
      "Mao Zedong proclaims the People's Republic from Tiananmen.",
    era: "contemporary",
  },
  {
    id: "moon-landing",
    year: 1969,
    month: 7,
    day: 20,
    title: "Apollo 11 lands on the Moon",
    description:
      "Neil Armstrong and Buzz Aldrin walk on the lunar surface.",
    era: "contemporary",
  },
  {
    id: "berlin-wall",
    year: 1989,
    month: 11,
    day: 9,
    title: "Fall of the Berlin Wall",
    description:
      "East Germans cross freely into West Berlin; the Cold War order begins to dissolve.",
    era: "contemporary",
  },
  {
    id: "ussr-dissolution",
    year: 1991,
    month: 12,
    day: 26,
    title: "Dissolution of the USSR",
    description:
      "The Soviet Union formally ceases to exist, leaving 15 successor states.",
    era: "contemporary",
  },
  {
    id: "nine-eleven",
    year: 2001,
    month: 9,
    day: 11,
    title: "September 11 attacks",
    description:
      "Coordinated al-Qaeda attacks in the United States kill nearly 3,000 and reshape global politics.",
    era: "contemporary",
  },
  {
    id: "gfc-2008",
    year: 2008,
    month: 9,
    day: 15,
    title: "Global Financial Crisis",
    description:
      "Lehman Brothers collapses, accelerating the worst financial crisis since the 1930s.",
    era: "contemporary",
  },
  {
    id: "covid-19",
    year: 2020,
    month: 3,
    day: 11,
    title: "COVID-19 pandemic",
    description:
      "WHO declares COVID-19 a pandemic; much of the world enters lockdown.",
    era: "contemporary",
  },
];
