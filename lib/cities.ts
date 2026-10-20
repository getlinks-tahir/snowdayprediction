import type { Country } from "./algorithm";

export interface City {
  slug: string;
  name: string;
  region: string;
  country: Country;
  lat: number;
  lon: number;
  district: string;
  /** Rough long-term yearly average. Inches for US cities, cm for Canadian cities. */
  avgSnow: number;
  note: string;
  trending?: boolean;
}

export const CITIES: City[] = [
  // United States
  { slug: "buffalo", name: "Buffalo", region: "NY", country: "US", lat: 42.8864, lon: -78.8784, district: "Buffalo Public Schools", avgSnow: 95, trending: true,
    note: "Buffalo sits at the east end of Lake Erie. Cold wind over the open lake can dump a foot of lake-effect snow on one part of town while another part stays almost clear." },
  { slug: "rochester", name: "Rochester", region: "NY", country: "US", lat: 43.1566, lon: -77.6088, district: "Rochester City School District", avgSnow: 99,
    note: "Rochester gets snow from Lake Ontario bands and from big coastal storms. Crews are fast but long bands that park over the city for hours still close schools." },
  { slug: "syracuse", name: "Syracuse", region: "NY", country: "US", lat: 43.0481, lon: -76.1474, district: "Syracuse City School District", avgSnow: 124,
    note: "Syracuse is often one of the snowiest big cities in the country. Because snow is so normal here it takes a very heavy or very windy morning to cancel school." },
  { slug: "new-york", name: "New York City", region: "NY", country: "US", lat: 40.7128, lon: -74.006, district: "New York City Public Schools", avgSnow: 29,
    note: "New York City almost never closes for snow. Most kids ride the subway or walk so the city now switches to remote learning on many storm days instead of taking a full day off." },
  { slug: "boston", name: "Boston", region: "MA", country: "US", lat: 42.3601, lon: -71.0589, district: "Boston Public Schools", avgSnow: 49, trending: true,
    note: "Boston closes when a nor'easter brings heavy snow with strong ocean wind. Narrow old streets are hard to plow which matters for bus routes." },
  { slug: "burlington", name: "Burlington", region: "VT", country: "US", lat: 44.4759, lon: -73.2121, district: "Burlington School District", avgSnow: 89,
    note: "Burlington knows winter well. Ice storms and very cold mornings worry leaders here more than a normal snowfall does." },
  { slug: "philadelphia", name: "Philadelphia", region: "PA", country: "US", lat: 39.9526, lon: -75.1652, district: "School District of Philadelphia", avgSnow: 23,
    note: "Philadelphia sits near the line where snow turns to rain. A small shift in the storm track can change a snow day into a normal wet day." },
  { slug: "pittsburgh", name: "Pittsburgh", region: "PA", country: "US", lat: 40.4406, lon: -79.9959, district: "Pittsburgh Public Schools", avgSnow: 42,
    note: "Pittsburgh has steep hills and many bridges. Even a thin layer of ice can make bus routes unsafe so two hour delays are common here." },
  { slug: "baltimore", name: "Baltimore", region: "MD", country: "US", lat: 39.2904, lon: -76.6122, district: "Baltimore City Public Schools", avgSnow: 20,
    note: "Baltimore gets less snow than cities to the north. When a real storm does hit the region tends to close schools quickly." },
  { slug: "washington", name: "Washington", region: "DC", country: "US", lat: 38.9072, lon: -77.0369, district: "District of Columbia Public Schools", avgSnow: 14,
    note: "Washington DC sees only a few inches most winters. Traffic is heavy and many families drive in from Maryland and Virginia so even light snow can cause delays." },
  { slug: "cleveland", name: "Cleveland", region: "OH", country: "US", lat: 41.4993, lon: -81.6944, district: "Cleveland Metropolitan School District", avgSnow: 55,
    note: "The east side of Cleveland is in the Lake Erie snow belt and often gets much more snow than the west side. Schools look at the whole district before they decide." },
  { slug: "columbus", name: "Columbus", region: "OH", country: "US", lat: 39.9612, lon: -82.9988, district: "Columbus City Schools", avgSnow: 27,
    note: "Columbus is far from the lakes so it gets less snow than Cleveland. Ice and very cold wind chills are common reasons for closures here." },
  { slug: "detroit", name: "Detroit", region: "MI", country: "US", lat: 42.3314, lon: -83.0458, district: "Detroit Public Schools Community District", avgSnow: 45,
    note: "Detroit has a lot of walkers and bus riders. Deep cold and icy sidewalks can close schools even when snow totals are modest." },
  { slug: "chicago", name: "Chicago", region: "IL", country: "US", lat: 41.8781, lon: -87.6298, district: "Chicago Public Schools", avgSnow: 38, trending: true,
    note: "Chicago has one of the biggest plow fleets in the country. Schools rarely close for snow alone but dangerous cold like the 2019 polar vortex has closed them." },
  { slug: "milwaukee", name: "Milwaukee", region: "WI", country: "US", lat: 43.0389, lon: -87.9065, district: "Milwaukee Public Schools", avgSnow: 46,
    note: "Milwaukee sits on Lake Michigan. Snow is normal here so extreme cold and wind chill are the more common causes of a day off." },
  { slug: "minneapolis", name: "Minneapolis", region: "MN", country: "US", lat: 44.9778, lon: -93.265, district: "Minneapolis Public Schools", avgSnow: 52, trending: true,
    note: "Minneapolis handles big snow with ease. Closures here are usually about dangerous wind chill at bus stops rather than inches on the road." },
  { slug: "fargo", name: "Fargo", region: "ND", country: "US", lat: 46.8772, lon: -96.7898, district: "Fargo Public Schools", avgSnow: 50,
    note: "Fargo is flat and open so wind blows snow across roads and builds drifts fast. Blowing snow and wind chill matter more here than snow depth." },
  { slug: "des-moines", name: "Des Moines", region: "IA", country: "US", lat: 41.5868, lon: -93.625, district: "Des Moines Public Schools", avgSnow: 34,
    note: "Des Moines gets snow and ice from storms that cross the Plains. Rural roads around the city often decide if buses can run." },
  { slug: "omaha", name: "Omaha", region: "NE", country: "US", lat: 41.2565, lon: -95.9345, district: "Omaha Public Schools", avgSnow: 27,
    note: "Omaha weather can swing fast. A warm day can turn into a windy snowy night with falling temperatures." },
  { slug: "indianapolis", name: "Indianapolis", region: "IN", country: "US", lat: 39.7684, lon: -86.1581, district: "Indianapolis Public Schools", avgSnow: 25,
    note: "Indianapolis often gets a mix of snow, sleet and freezing rain. Ice is the most common reason buses stay home." },
  { slug: "st-louis", name: "St. Louis", region: "MO", country: "US", lat: 38.627, lon: -90.1994, district: "St. Louis Public Schools", avgSnow: 17,
    note: "St. Louis sits in a zone where ice storms are common. A thin glaze can shut down roads faster than a few inches of snow." },
  { slug: "kansas-city", name: "Kansas City", region: "MO", country: "US", lat: 39.0997, lon: -94.5786, district: "Kansas City Public Schools", avgSnow: 18,
    note: "Kansas City gets fewer storms than the upper Midwest. When snow and ice do arrive the metro often closes or moves to remote learning." },
  { slug: "denver", name: "Denver", region: "CO", country: "US", lat: 39.7392, lon: -104.9903, district: "Denver Public Schools", avgSnow: 57,
    note: "Denver snow often melts fast in the strong sun. Big spring storms and upslope snow can still bury the city and close schools." },
  { slug: "salt-lake-city", name: "Salt Lake City", region: "UT", country: "US", lat: 40.7608, lon: -111.891, district: "Salt Lake City School District", avgSnow: 51,
    note: "Salt Lake City gets lake-effect snow from the Great Salt Lake. The valley is used to snow so full closures are rare." },
  { slug: "anchorage", name: "Anchorage", region: "AK", country: "US", lat: 61.2181, lon: -149.9003, district: "Anchorage School District", avgSnow: 75,
    note: "Anchorage has long dark winter mornings. Closures happen after very heavy snow or when ice and wind make roads unsafe." },
  { slug: "seattle", name: "Seattle", region: "WA", country: "US", lat: 47.6062, lon: -122.3321, district: "Seattle Public Schools", avgSnow: 6,
    note: "Seattle sees little snow but has many steep hills. A couple of inches can make roads too slick for buses." },
  { slug: "portland", name: "Portland", region: "OR", country: "US", lat: 45.5152, lon: -122.6784, district: "Portland Public Schools", avgSnow: 4,
    note: "Portland gets rare but tricky winter storms. Cold air from the Columbia River Gorge can bring freezing rain that coats everything in ice." },
  { slug: "nashville", name: "Nashville", region: "TN", country: "US", lat: 36.1627, lon: -86.7816, district: "Metro Nashville Public Schools", avgSnow: 5,
    note: "Nashville has few plows and many hills. Even one or two inches of snow or a little ice can close schools for days." },
  { slug: "atlanta", name: "Atlanta", region: "GA", country: "US", lat: 33.749, lon: -84.388, district: "Atlanta Public Schools", avgSnow: 2,
    note: "Atlanta gets snow only a few times each decade. The 2014 storm that trapped kids on buses and in schools taught leaders to close early when ice is possible." },
  { slug: "charlotte", name: "Charlotte", region: "NC", country: "US", lat: 35.2271, lon: -80.8431, district: "Charlotte-Mecklenburg Schools", avgSnow: 4,
    note: "Charlotte often gets sleet and freezing rain instead of snow. Schools close quickly because roads ice over and there are few salt trucks." },
  { slug: "dallas", name: "Dallas", region: "TX", country: "US", lat: 32.7767, lon: -96.797, district: "Dallas Independent School District", avgSnow: 1.5,
    note: "Dallas rarely sees snow. Ice on overpasses and bridges is the big danger so a small storm can close schools across North Texas." },

  // Canada
  { slug: "toronto", name: "Toronto", region: "ON", country: "CA", lat: 43.6532, lon: -79.3832, district: "Toronto District School Board", avgSnow: 120, trending: true,
    note: "Toronto boards often cancel school buses but keep buildings open for kids who walk. A full closure of all schools is rare and needs a major storm." },
  { slug: "ottawa", name: "Ottawa", region: "ON", country: "CA", lat: 45.4215, lon: -75.6972, district: "Ottawa-Carleton District School Board", avgSnow: 224,
    note: "Ottawa is one of the snowiest capital cities in the world. Bus cancellations for freezing rain are much more common than full closures." },
  { slug: "montreal", name: "Montreal", region: "QC", country: "CA", lat: 45.5017, lon: -73.5673, district: "Centre de services scolaire de Montréal", avgSnow: 210, trending: true,
    note: "Montreal gets over two metres of snow in a normal winter. Freezing rain is the main worry since the 1998 ice storm showed how much damage ice can do." },
  { slug: "quebec-city", name: "Québec City", region: "QC", country: "CA", lat: 46.8139, lon: -71.208, district: "Centre de services scolaire de la Capitale", avgSnow: 300,
    note: "Québec City gets about three metres of snow each winter. It takes a true storm with strong wind before schools close." },
  { slug: "halifax", name: "Halifax", region: "NS", country: "CA", lat: 44.6488, lon: -63.5752, district: "Halifax Regional Centre for Education", avgSnow: 230,
    note: "Halifax gets strong ocean storms that swing between snow, ice pellets and rain. That messy mix closes schools more often than cold does." },
  { slug: "winnipeg", name: "Winnipeg", region: "MB", country: "CA", lat: 49.8951, lon: -97.1384, district: "Winnipeg School Division", avgSnow: 110,
    note: "Winnipeg is famous for deep cold. Schools stay open in weather that would stop most cities but bus service can be cut during blizzards." },
  { slug: "regina", name: "Regina", region: "SK", country: "CA", lat: 50.4452, lon: -104.6189, district: "Regina Public Schools", avgSnow: 106,
    note: "Regina is open prairie. Wind turns light snow into ground blizzards with near zero visibility on the roads." },
  { slug: "saskatoon", name: "Saskatoon", region: "SK", country: "CA", lat: 52.1332, lon: -106.67, district: "Saskatoon Public Schools", avgSnow: 97,
    note: "Saskatoon gets long cold spells. Rural bus routes are often cancelled on extreme cold days while city schools stay open." },
  { slug: "calgary", name: "Calgary", region: "AB", country: "CA", lat: 51.0447, lon: -114.0719, district: "Calgary Board of Education", avgSnow: 128,
    note: "Calgary gets warm chinook winds that melt snow fast. Schools there almost never close but yellow bus service can be cancelled in extreme cold." },
  { slug: "edmonton", name: "Edmonton", region: "AB", country: "CA", lat: 53.5461, lon: -113.4938, district: "Edmonton Public Schools", avgSnow: 123,
    note: "Edmonton winters are long and very cold. The district rarely closes and instead tells families to dress for the cold." },
  { slug: "vancouver", name: "Vancouver", region: "BC", country: "CA", lat: 49.2827, lon: -123.1207, district: "Vancouver School Board", avgSnow: 38,
    note: "Vancouver gets little snow and many drivers do not use winter tires. A few centimetres on the hills can close schools across Metro Vancouver." },
];

export const TRENDING_CITIES = CITIES.filter((c) => c.trending);

export function getCity(slug: string): City | undefined {
  return CITIES.find((c) => c.slug === slug);
}

export function formatAvgSnow(city: City): string {
  return city.country === "US" ? `about ${city.avgSnow} inches` : `about ${city.avgSnow} cm`;
}
