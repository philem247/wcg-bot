// Builds data/flags.json for Guess the Flag.
//
// Flag emoji are NOT hand-typed here — they are derived from each country's
// ISO 3166-1 alpha-2 code by mapping A-Z onto the Regional Indicator Symbol
// block (U+1F1E6..U+1F1FF). Two regional indicators in sequence render as that
// country's flag. Deriving them means a typo produces a visibly wrong/blank
// flag rather than a subtly wrong one, and the codes themselves are checkable.
import { writeFileSync } from 'node:fs'

const RI_BASE = 0x1f1e6
const A = 'A'.codePointAt(0)

function flagOf(code) {
  return [...code.toUpperCase()]
    .map((c) => String.fromCodePoint(RI_BASE + (c.codePointAt(0) - A)))
    .join('')
}

// [alpha-2, canonical name, ...accepted aliases]
// Aliases exist so a player typing the everyday name still scores: the bot
// should never reject "Holland" for the Netherlands or "UAE" for the Emirates.
const COUNTRIES = [
  ['NG', 'Nigeria'],
  ['GH', 'Ghana'],
  ['KE', 'Kenya'],
  ['ZA', 'South Africa'],
  ['EG', 'Egypt'],
  ['MA', 'Morocco'],
  ['DZ', 'Algeria'],
  ['TN', 'Tunisia'],
  ['LY', 'Libya'],
  ['SD', 'Sudan'],
  ['SS', 'South Sudan'],
  ['ET', 'Ethiopia'],
  ['ER', 'Eritrea'],
  ['DJ', 'Djibouti'],
  ['SO', 'Somalia'],
  ['UG', 'Uganda'],
  ['TZ', 'Tanzania'],
  ['RW', 'Rwanda'],
  ['BI', 'Burundi'],
  ['CD', 'DR Congo', 'Democratic Republic of the Congo', 'DRC', 'Congo-Kinshasa'],
  ['CG', 'Republic of the Congo', 'Congo', 'Congo-Brazzaville'],
  ['CM', 'Cameroon'],
  ['CF', 'Central African Republic', 'CAR'],
  ['TD', 'Chad'],
  ['NE', 'Niger'],
  ['ML', 'Mali'],
  ['BF', 'Burkina Faso'],
  ['SN', 'Senegal'],
  ['GM', 'Gambia', 'The Gambia'],
  ['GW', 'Guinea-Bissau'],
  ['GN', 'Guinea'],
  ['SL', 'Sierra Leone'],
  ['LR', 'Liberia'],
  ['CI', 'Ivory Coast', "Cote d'Ivoire", 'Côte d’Ivoire'],
  ['TG', 'Togo'],
  ['BJ', 'Benin'],
  ['GA', 'Gabon'],
  ['GQ', 'Equatorial Guinea'],
  ['ST', 'Sao Tome and Principe', 'São Tomé and Príncipe'],
  ['CV', 'Cape Verde', 'Cabo Verde'],
  ['MR', 'Mauritania'],
  ['AO', 'Angola'],
  ['ZM', 'Zambia'],
  ['ZW', 'Zimbabwe'],
  ['MW', 'Malawi'],
  ['MZ', 'Mozambique'],
  ['BW', 'Botswana'],
  ['NA', 'Namibia'],
  ['LS', 'Lesotho'],
  ['SZ', 'Eswatini', 'Swaziland'],
  ['MG', 'Madagascar'],
  ['MU', 'Mauritius'],
  ['SC', 'Seychelles'],
  ['KM', 'Comoros'],

  ['US', 'United States', 'USA', 'US', 'America', 'United States of America'],
  ['CA', 'Canada'],
  ['MX', 'Mexico'],
  ['GT', 'Guatemala'],
  ['BZ', 'Belize'],
  ['HN', 'Honduras'],
  ['SV', 'El Salvador'],
  ['NI', 'Nicaragua'],
  ['CR', 'Costa Rica'],
  ['PA', 'Panama'],
  ['CU', 'Cuba'],
  ['JM', 'Jamaica'],
  ['HT', 'Haiti'],
  ['DO', 'Dominican Republic'],
  ['TT', 'Trinidad and Tobago', 'Trinidad & Tobago', 'Trinidad'],
  ['BB', 'Barbados'],
  ['BS', 'Bahamas', 'The Bahamas'],

  ['BR', 'Brazil'],
  ['AR', 'Argentina'],
  ['CL', 'Chile'],
  ['PE', 'Peru'],
  ['CO', 'Colombia'],
  ['VE', 'Venezuela'],
  ['EC', 'Ecuador'],
  ['BO', 'Bolivia'],
  ['PY', 'Paraguay'],
  ['UY', 'Uruguay'],
  ['GY', 'Guyana'],
  ['SR', 'Suriname'],

  ['GB', 'United Kingdom', 'UK', 'Great Britain', 'Britain'],
  ['IE', 'Ireland'],
  ['FR', 'France'],
  ['DE', 'Germany'],
  ['IT', 'Italy'],
  ['ES', 'Spain'],
  ['PT', 'Portugal'],
  ['NL', 'Netherlands', 'Holland', 'The Netherlands'],
  ['BE', 'Belgium'],
  ['LU', 'Luxembourg'],
  ['CH', 'Switzerland'],
  ['AT', 'Austria'],
  ['DK', 'Denmark'],
  ['SE', 'Sweden'],
  ['NO', 'Norway'],
  ['FI', 'Finland'],
  ['IS', 'Iceland'],
  ['PL', 'Poland'],
  ['CZ', 'Czech Republic', 'Czechia'],
  ['SK', 'Slovakia'],
  ['HU', 'Hungary'],
  ['RO', 'Romania'],
  ['BG', 'Bulgaria'],
  ['GR', 'Greece'],
  ['HR', 'Croatia'],
  ['RS', 'Serbia'],
  ['SI', 'Slovenia'],
  ['BA', 'Bosnia and Herzegovina', 'Bosnia'],
  ['ME', 'Montenegro'],
  ['MK', 'North Macedonia', 'Macedonia'],
  ['AL', 'Albania'],
  ['XK', 'Kosovo'],
  ['UA', 'Ukraine'],
  ['BY', 'Belarus'],
  ['MD', 'Moldova'],
  ['LT', 'Lithuania'],
  ['LV', 'Latvia'],
  ['EE', 'Estonia'],
  ['RU', 'Russia'],
  ['MT', 'Malta'],
  ['CY', 'Cyprus'],

  ['TR', 'Turkey', 'Türkiye', 'Turkiye'],
  ['SA', 'Saudi Arabia'],
  ['AE', 'United Arab Emirates', 'UAE', 'Emirates'],
  ['QA', 'Qatar'],
  ['KW', 'Kuwait'],
  ['BH', 'Bahrain'],
  ['OM', 'Oman'],
  ['YE', 'Yemen'],
  ['JO', 'Jordan'],
  ['LB', 'Lebanon'],
  ['SY', 'Syria'],
  ['IQ', 'Iraq'],
  ['IR', 'Iran'],
  ['IL', 'Israel'],
  ['PS', 'Palestine'],
  ['AF', 'Afghanistan'],
  ['PK', 'Pakistan'],
  ['IN', 'India'],
  ['BD', 'Bangladesh'],
  ['LK', 'Sri Lanka'],
  ['NP', 'Nepal'],
  ['BT', 'Bhutan'],
  ['MV', 'Maldives'],
  ['CN', 'China'],
  ['JP', 'Japan'],
  ['KR', 'South Korea', 'Korea', 'Republic of Korea'],
  ['KP', 'North Korea'],
  ['MN', 'Mongolia'],
  ['TW', 'Taiwan'],
  ['VN', 'Vietnam'],
  ['TH', 'Thailand'],
  ['LA', 'Laos'],
  ['KH', 'Cambodia'],
  ['MM', 'Myanmar', 'Burma'],
  ['MY', 'Malaysia'],
  ['SG', 'Singapore'],
  ['ID', 'Indonesia'],
  ['PH', 'Philippines'],
  ['BN', 'Brunei'],
  ['TL', 'Timor-Leste', 'East Timor'],
  ['KZ', 'Kazakhstan'],
  ['UZ', 'Uzbekistan'],
  ['TM', 'Turkmenistan'],
  ['KG', 'Kyrgyzstan'],
  ['TJ', 'Tajikistan'],
  ['AZ', 'Azerbaijan'],
  ['AM', 'Armenia'],
  ['GE', 'Georgia'],

  ['AU', 'Australia'],
  ['NZ', 'New Zealand'],
  ['PG', 'Papua New Guinea'],
  ['FJ', 'Fiji'],
  ['SB', 'Solomon Islands'],
  ['VU', 'Vanuatu'],
  ['WS', 'Samoa'],
  ['TO', 'Tonga'],
]

function main() {
  const seenCode = new Set()
  const seenName = new Set()
  const flags = []

  for (const [code, name, ...aliases] of COUNTRIES) {
    if (!/^[A-Z]{2}$/.test(code)) throw new Error(`bad ISO code: ${code}`)
    if (seenCode.has(code)) throw new Error(`duplicate ISO code: ${code}`)
    if (seenName.has(name)) throw new Error(`duplicate country name: ${name}`)
    seenCode.add(code)
    seenName.add(name)
    flags.push({ code, name, emoji: flagOf(code), aliases })
  }

  writeFileSync(
    './data/flags.json',
    JSON.stringify({ attribution: 'ISO 3166-1 alpha-2', generated: new Date().toISOString(), flags }, null, 1)
  )
  console.log(`Wrote data/flags.json — ${flags.length} countries`)
}

main()
