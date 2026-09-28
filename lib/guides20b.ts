import type { Destination } from "./destinations";

type More = Pick<Destination, "hotels" | "transit" | "events" | "nightlife" | "sports">;

const H = (name: string, area: string, tier: "Luxury" | "Mid-range" | "Value") => ({ name, area, tier });
const E = (name: string, when: string, text: string) => ({ name, when, text });

/** Hotels, transport tips and annual events for the top-20 guides. Recurring events only; dates shift yearly. */
export const MORE: Record<string, More> = {
  london: {
    hotels: [H("The Savoy", "Strand, on the Thames", "Luxury"), H("The Hoxton, Holborn", "Holborn, central", "Mid-range"), H("citizenM Tower of London", "Tower Hill", "Value")],
    transit: ["Tap a contactless card on Tube, buses and trains; daily and weekly caps apply.", "Elizabeth line crosses the city east–west fast, including Heathrow.", "Eurostar to Paris from St Pancras in about 2h20.", "Day trips by train: Oxford 1h, Bath 1h30, Brighton 1h."],
    events: [E("New Year's Eve fireworks", "Dec 31", "Ticketed viewing along the Thames by the London Eye."), E("Notting Hill Carnival", "Late August", "Europe's biggest street carnival."), E("Chelsea Flower Show", "May", "World-famous garden show."), E("West End season", "Year-round", "Musicals and plays nightly.")],
    nightlife: "Soho and Shoreditch for bars, fabric for clubbing, rooftop bars along the South Bank.",
    sports: "Premier League football (Aug–May: Arsenal, Chelsea, Tottenham and more), Wimbledon tennis (late June–July), London Marathon (April), rugby at Twickenham.",
  },
  paris: {
    hotels: [H("Le Meurice", "Tuileries", "Luxury"), H("Hôtel des Grands Boulevards", "2nd arrondissement", "Mid-range"), H("citizenM Paris Gare de Lyon", "12th arrondissement", "Value")],
    transit: ["Metro and RER cover the city; use a Navigo Easy card or phone tickets.", "TGV high-speed trains to Lyon 2h, Bordeaux 2h, Marseille 3h.", "Eurostar to London about 2h20; to Brussels 1h20.", "Night buses (Noctilien) run after the metro closes."],
    events: [E("Bastille Day", "July 14", "Military parade and Eiffel Tower fireworks."), E("Fête de la Musique", "June 21", "Free concerts on every street."), E("Nuit Blanche", "Early October", "All-night art across the city."), E("Paris Fashion Week", "Late Feb–Mar and Sep–Oct", "Shows and parties citywide.")],
    nightlife: "Le Marais and Pigalle for bars, Oberkampf for late nights, Seine-side barges for summer parties.",
    sports: "Roland-Garros tennis (late May–June), Tour de France finish (July), Paris Saint-Germain at Parc des Princes, rugby at Stade de France.",
  },
  dubai: {
    hotels: [H("Burj Al Arab", "Jumeirah Beach", "Luxury"), H("Address Downtown", "Next to Burj Khalifa", "Mid-range"), H("Rove Downtown", "Downtown", "Value")],
    transit: ["Metro Red and Green lines; buy a Nol card.", "Taxis and ride-hailing are affordable.", "Intercity bus to Abu Dhabi about 2 hours.", "Dubai Tram serves the Marina and JBR."],
    events: [E("Dubai Shopping Festival", "Dec–Jan", "Sales, concerts and nightly fireworks."), E("New Year's Eve at Burj Khalifa", "Dec 31", "One of the world's biggest fireworks shows."), E("Art Dubai", "March", "Leading art fair of the region."), E("Global Village", "Oct–April", "Pavilions, food and shows from around the world.")],
    nightlife: "Beach clubs, rooftop lounges and superclubs in hotels; alcohol only in licensed venues.",
    sports: "Dubai World Cup horse race (March), Dubai Tennis Championships (February), DP World Tour Championship golf (November).",
  },
  bangkok: {
    hotels: [H("Mandarin Oriental Bangkok", "Riverside", "Luxury"), H("Kimpton Maa-Lai Bangkok", "Langsuan, near Lumpini Park", "Mid-range"), H("Lub d Bangkok Siam", "Siam", "Value")],
    transit: ["BTS Skytrain and MRT beat the traffic; tap a contactless card on many lines.", "Chao Phraya Express boats for riverside sights.", "Trains and buses to Ayutthaya about 1–2 hours.", "Overnight trains or short flights to Chiang Mai."],
    events: [E("Songkran water festival", "April 13–15", "Thai New Year with citywide water fights."), E("Loy Krathong", "November (full moon)", "Candlelit floats released on the river."), E("Chinese New Year in Yaowarat", "January/February", "Chinatown's biggest celebration."), E("Vegetarian Festival", "Late September–October", "Food stalls with yellow flags in Chinatown.")],
    nightlife: "Rooftop bars in Silom and Sukhumvit, clubs in Thonglor and RCA, backpacker scene on Khao San Road.",
    sports: "Muay Thai at Rajadamnern and Lumpinee stadiums; Thai League football, Bangkok Marathon (November).",
  },
  rome: {
    hotels: [H("Hotel Hassler Roma", "Top of the Spanish Steps", "Luxury"), H("Hotel Artemide", "Via Nazionale", "Mid-range"), H("The Hoxton, Rome", "Parioli", "Value")],
    transit: ["Walk the center; Metro lines A, B and C for longer trips.", "Frecciarossa high-speed trains: Florence 1h30, Naples 1h10, Milan 3h.", "Buses and trams for Trastevere.", "Validate paper tickets or tap a card at the gates."],
    events: [E("Holy Week and Easter", "March/April", "Papal Masses at St. Peter's."), E("Rome Film Fest", "October", "Red carpets at the Auditorium."), E("Estate Romana", "June–September", "Summer concerts and open-air cinema."), E("Christmas markets", "December", "Piazza Navona's traditional market.")],
    nightlife: "Trastevere and Monti for wine bars, Testaccio for clubs.",
    sports: "AS Roma and Lazio at Stadio Olimpico, Italian Open tennis (May), Six Nations rugby (February–March).",
  },
  tokyo: {
    hotels: [H("Aman Tokyo", "Otemachi", "Luxury"), H("Hotel Gracery Shinjuku", "Shinjuku", "Mid-range"), H("Tokyu Stay Shibuya", "Shibuya", "Value")],
    transit: ["Suica or Pasmo on your phone for trains, subway and shops.", "Shinkansen bullet trains: Kyoto 2h15, Osaka 2h30.", "Japan Rail Pass only pays off for long multi-city trips.", "Last trains leave around midnight; plan late nights."],
    events: [E("Cherry blossom season", "Late March–early April", "Picnics under the blossoms in Ueno and Shinjuku Gyoen."), E("Sumida River Fireworks", "Late July", "Tokyo's biggest fireworks."), E("Sanja Matsuri", "May", "Asakusa's lively shrine festival."), E("Halloween in Shibuya", "October 31", "Street costumes (crowd rules apply).")],
    nightlife: "Golden Gai's tiny bars, Shibuya clubs, Roppongi for international crowds.",
    sports: "Sumo at Ryōgoku (January, May, September), Yomiuri Giants baseball at Tokyo Dome, Tokyo Marathon (March).",
  },
  "new-york": {
    hotels: [H("The Plaza", "Central Park South", "Luxury"), H("The Hoxton, Williamsburg", "Brooklyn", "Mid-range"), H("Pod Times Square", "Midtown West", "Value")],
    transit: ["Subway 24/7; tap a contactless card (OMNY).", "Amtrak to Washington DC 3h, Boston 3h30.", "Buses and NJ Transit to New Jersey; LIRR to Long Island beaches.", "Citi Bike for short hops."],
    events: [E("New Year's Eve in Times Square", "Dec 31", "The ball drop."), E("Macy's Thanksgiving Day Parade", "Late November", "Giant balloons on Central Park West."), E("Rockefeller Center tree lighting", "Late Nov–early Dec", "Kicks off the holiday season."), E("Pride March", "Late June", "One of the world's largest.")],
    nightlife: "Lower East Side and West Village bars, Brooklyn clubs, rooftop bars in Midtown.",
    sports: "US Open tennis (late Aug–Sep), NYC Marathon (November), Yankees and Mets baseball, Knicks and Rangers at Madison Square Garden.",
  },
  "hong-kong": {
    hotels: [H("The Peninsula Hong Kong", "Tsim Sha Tsui", "Luxury"), H("Hotel ICON", "Tsim Sha Tsui East", "Mid-range"), H("Ovolo Central", "Central", "Value")],
    transit: ["Octopus card for MTR, trams, buses and ferries.", "High-speed rail to Guangzhou and Shenzhen.", "Ferries and bridge buses to Macau about 1 hour.", "Ding-ding trams across Hong Kong Island for pocket change."],
    events: [E("Chinese New Year", "January/February", "Night parade and harbor fireworks."), E("Dragon Boat Festival", "June", "Races in Victoria Harbour and Stanley."), E("Clockenflap", "Late year", "Major music festival."), E("Mid-Autumn Festival", "September/October", "Lantern displays in Victoria Park.")],
    nightlife: "Lan Kwai Fong and SoHo for bars, rooftop bars in Central.",
    sports: "Hong Kong Sevens rugby (spring, Kai Tak Stadium), Wednesday-night horse racing at Happy Valley, Hong Kong Marathon (February).",
  },
  macau: {
    hotels: [H("Wynn Palace", "Cotai", "Luxury"), H("Galaxy Macau", "Cotai", "Mid-range"), H("Studio City", "Cotai", "Value")],
    transit: ["Light rail on Taipa and Cotai; buses citywide.", "Free resort shuttles from ferry terminals and the border.", "Ferries to Hong Kong about 1 hour; bridge buses 24/7.", "Cross into Zhuhai, mainland China, on foot (visa rules apply)."],
    events: [E("Macau Grand Prix", "November", "Street racing through the city."), E("International Fireworks Display Contest", "September–October", "Weekend fireworks over the bay."), E("Chinese New Year", "January/February", "Parades and dragon dances."), E("Macau Food Festival", "November", "Street-food fair at Sai Van Lake.")],
    nightlife: "Resort lounges and shows on Cotai, bars in Taipa Village.",
    sports: "Macau Grand Prix (November), world-class boxing and table tennis events at Cotai arenas.",
  },
  istanbul: {
    hotels: [H("Four Seasons Sultanahmet", "Old City", "Luxury"), H("Pera Palace Hotel", "Beyoğlu", "Mid-range"), H("Hotel Amira", "Sultanahmet", "Value")],
    transit: ["İstanbulkart for tram, metro, Marmaray and ferries.", "Ferries between Europe and Asia are cheap and scenic.", "High-speed trains to Ankara about 4.5 hours.", "Long-distance buses cover all of Türkiye."],
    events: [E("Istanbul Tulip Festival", "April", "Millions of tulips in the parks."), E("Istanbul Jazz Festival", "June–July", "Concerts across the city."), E("Istanbul Biennial", "Autumn (odd years)", "Contemporary art."), E("Ramadan evenings", "Varies", "Iftar gatherings around Sultanahmet.")],
    nightlife: "Rooftop bars in Karaköy and Galata, clubs in Beyoğlu, Bosphorus-side venues in summer.",
    sports: "Galatasaray, Fenerbahçe and Beşiktaş football derbies; Istanbul Marathon crosses continents (November).",
  },
  mecca: {
    hotels: [H("Fairmont Makkah Clock Royal Tower", "Abraj Al Bait, facing the Haram", "Luxury"), H("Swissôtel Makkah", "Abraj Al Bait", "Mid-range"), H("Pullman ZamZam Makkah", "Next to the Haram", "Value")],
    transit: ["Haramain high-speed train connects Jeddah, Mecca and Madinah.", "Hotel shuttles and public buses run to the Haram.", "During Hajj, transport between holy sites is organized by your operator.", "Book train seats early for Ramadan and Hajj."],
    events: [E("Ramadan", "Varies yearly", "Busiest Umrah period, especially the last ten nights."), E("Hajj", "Dhul Hijjah, varies yearly", "The annual pilgrimage, by Hajj visa only."), E("Eid al-Fitr and Eid al-Adha", "Varies yearly", "Prayers at the Grand Mosque.")],
    nightlife: "Not applicable: Mecca is a religious city. Evenings center on prayers at the Haram.",
    sports: "None in Mecca itself. Nearby Jeddah hosts the Saudi Arabian Formula 1 Grand Prix (usually spring).",
  },
  antalya: {
    hotels: [H("Regnum Carya", "Belek", "Luxury"), H("Akra Hotel", "Lara coast road", "Mid-range"), H("Tuvana Hotel", "Kaleiçi old town", "Value")],
    transit: ["City trams and taxis; dolmuş minibuses to beaches.", "Resort transfers to Belek, Side and Kemer.", "Long-distance buses to Pamukkale and Cappadocia.", "Rent a car for the Lycian coast."],
    events: [E("Aspendos Opera and Ballet Festival", "Summer", "Performances in the Roman theater."), E("Antalya Golden Orange Film Festival", "October", "Türkiye's oldest film festival."), E("Beach season", "May–October", "Beach clubs along Konyaaltı and Lara.")],
    nightlife: "Kaleiçi harbor bars, beach clubs in Konyaaltı, resort shows.",
    sports: "Top golf courses in Belek, Antalyaspor football, the Antalya Marathon (March).",
  },
  "kuala-lumpur": {
    hotels: [H("Mandarin Oriental Kuala Lumpur", "KLCC", "Luxury"), H("The RuMa Hotel and Residences", "KLCC", "Mid-range"), H("Hotel Stripes Kuala Lumpur", "Chow Kit", "Value")],
    transit: ["LRT, MRT and monorail; Touch 'n Go card.", "KTM trains to Batu Caves.", "ETS trains to Ipoh and Penang.", "Buses to Malacca about 2 hours."],
    events: [E("Thaipusam at Batu Caves", "January/February", "Huge Hindu procession."), E("Merdeka Day", "August 31", "National Day parade."), E("Chinese New Year and Hari Raya", "Varies", "Open houses and street festivities."), E("Deepavali", "October/November", "Lights in Brickfields' Little India.")],
    nightlife: "Changkat Bukit Bintang bars, rooftop bars with tower views, TREC clubs.",
    sports: "Malaysian MotoGP at Sepang (October–November), badminton events at Axiata Arena.",
  },
  madrid: {
    hotels: [H("Four Seasons Hotel Madrid", "Sol", "Luxury"), H("Only YOU Boutique Hotel", "Chueca", "Mid-range"), H("Room Mate Óscar", "Chueca", "Value")],
    transit: ["Metro everywhere; buy a Multi card.", "AVE trains: Barcelona 2.5h, Seville 2.5h, Toledo 33 min.", "Cercanías commuter trains to El Escorial.", "Buses to Segovia about 1h15."],
    events: [E("San Isidro", "Mid-May", "Madrid's patron saint festival."), E("Madrid Pride (MADO)", "Late June–early July", "One of Europe's biggest."), E("Christmas and New Year at Puerta del Sol", "December", "Twelve grapes at midnight."), E("Veranos de la Villa", "Summer", "Open-air concerts and theater.")],
    nightlife: "Malasaña and La Latina bars, clubs like Teatro Kapital, rooftop terraces on Gran Vía.",
    sports: "Real Madrid at the Santiago Bernabéu, Atlético at the Metropolitano, Mutua Madrid Open tennis (April–May).",
  },
  milan: {
    hotels: [H("Armani Hotel Milano", "Quadrilatero della Moda", "Luxury"), H("Room Mate Giulia", "Next to the Duomo", "Mid-range"), H("Ostello Bello Grande", "Near Centrale station", "Value")],
    transit: ["Metro and trams; tap a contactless card.", "High-speed trains: Venice 2h15, Florence 1h50, Rome 3h.", "Trains to Lake Como (Varenna) about 1 hour.", "Malpensa Express to the main airport."],
    events: [E("Milan Fashion Week", "February and September", "Shows and parties citywide."), E("Salone del Mobile (Design Week)", "April", "The world's biggest design fair."), E("La Scala season opening", "December 7", "Opera's most glamorous night."), E("Christmas markets", "December", "Around the Duomo.")],
    nightlife: "Navigli canal bars, Corso Como clubs, aperitivo everywhere.",
    sports: "AC Milan and Inter at San Siro, Italian Formula 1 Grand Prix at nearby Monza (September).",
  },
  singapore: {
    hotels: [H("Raffles Singapore", "Civic District", "Luxury"), H("Marina Bay Sands", "Marina Bay", "Mid-range"), H("Hotel G Singapore", "Bugis", "Value")],
    transit: ["MRT and buses; tap a contactless card.", "Taxis and ride-hailing are metered and cheap.", "Buses and train to Johor Bahru, Malaysia (passport needed).", "Changi is 25 min by taxi."],
    events: [E("Formula 1 Singapore Grand Prix", "September–October", "Night race around Marina Bay."), E("Chinese New Year", "January/February", "River Hongbao and Chinatown lights."), E("National Day", "August 9", "Parade and fireworks."), E("Deepavali in Little India", "October/November", "Street lights and markets.")],
    nightlife: "Clarke Quay clubs, rooftop bars at Marina Bay, cocktail bars in Tanjong Pagar.",
    sports: "F1 Singapore Grand Prix, HSBC Singapore Rugby Sevens, golf at Sentosa.",
  },
  seoul: {
    hotels: [H("Signiel Seoul", "Lotte World Tower", "Luxury"), H("RYSE, Autograph Collection", "Hongdae", "Mid-range"), H("L7 Myeongdong", "Myeongdong", "Value")],
    transit: ["T-money card for subway, buses and taxis.", "KTX high-speed trains: Busan 2.5 hours.", "Airport limousine buses to major hotels.", "Night buses (N-routes) after the subway closes."],
    events: [E("Lotus Lantern Festival", "May (Buddha's Birthday)", "Lantern parade through Jongno."), E("Seoul Lantern Festival", "November", "Lanterns along Cheonggyecheon stream."), E("Cherry blossoms at Yeouido", "Early April", "Blossom festival by the river."), E("K-pop concerts", "Year-round", "Stadium shows and music programs.")],
    nightlife: "Hongdae clubs and live music, Itaewon bars, Gangnam clubs.",
    sports: "KBO baseball at Jamsil Stadium (Doosan and LG), K League football.",
  },
  osaka: {
    hotels: [H("The St. Regis Osaka", "Midosuji", "Luxury"), H("Cross Hotel Osaka", "Shinsaibashi", "Mid-range"), H("Hotel Hankyu RESPIRE Osaka", "Umeda", "Value")],
    transit: ["ICOCA card for metro and JR trains.", "Kyoto 15–30 min, Kobe 20 min, Nara 45 min by train.", "Shinkansen from Shin-Osaka to Tokyo about 2.5 hours.", "Kansai passes for many day trips."],
    events: [E("Tenjin Matsuri", "July 24–25", "Boat procession and fireworks."), E("Kishiwada Danjiri", "September", "Giant wooden floats racing through streets."), E("Cherry blossoms at Osaka Castle", "Late March–April", "Night illuminations."), E("Osaka Hikari Renaissance", "December", "City light festival.")],
    nightlife: "Dotonbori and Namba bars, Amerikamura clubs, standing bars in Umeda.",
    sports: "Hanshin Tigers baseball at Koshien Stadium, sumo Spring Tournament (March), Osaka Marathon (February).",
  },
  taipei: {
    hotels: [H("Mandarin Oriental Taipei", "Songshan", "Luxury"), H("Hotel Proverbs Taipei", "Da'an", "Mid-range"), H("Home Hotel Da-An", "Da'an", "Value")],
    transit: ["EasyCard for metro, buses and YouBike.", "High-speed rail to Kaohsiung 1.5–2 hours.", "Buses to Jiufen about 1 hour.", "Taiwan Railway trains along the east coast to Hualien."],
    events: [E("Pingxi Sky Lantern Festival", "February (Lantern Festival)", "Thousands of lanterns released at once."), E("New Year's Eve at Taipei 101", "Dec 31", "Fireworks off the tower."), E("Dragon Boat Festival", "June", "Races on the Keelung River."), E("Ghost Month", "August", "Temple rituals and offerings.")],
    nightlife: "Xinyi clubs, bars in Da'an, night markets until late.",
    sports: "CPBL baseball, Taipei Marathon (December).",
  },
  kyoto: {
    hotels: [H("The Ritz-Carlton, Kyoto", "Kamogawa River", "Luxury"), H("Ace Hotel Kyoto", "Karasuma", "Mid-range"), H("Piece Hostel Sanjo", "Sanjo", "Value")],
    transit: ["Buses reach most temples but crowd up; combine with subway and trains.", "Keihan and JR lines to Fushimi Inari and Arashiyama.", "Shinkansen to Tokyo about 2h15.", "Bike rental for flat central areas."],
    events: [E("Gion Matsuri", "All of July (parades July 17 and 24)", "Japan's most famous festival."), E("Aoi Matsuri", "May 15", "Imperial court procession."), E("Gozan no Okuribi", "August 16", "Giant bonfires on the mountains."), E("Jidai Matsuri", "October 22", "Historical costume parade.")],
    nightlife: "Pontocho alley bars, Kiyamachi, riverside terraces in summer.",
    sports: "Kyoto Marathon (February), Kyoto Sanga football.",
  },
};
