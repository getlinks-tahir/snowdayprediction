export interface PostSection {
  heading?: string;
  paragraphs?: string[];
  list?: string[];
  callout?: string;
}

export interface Post {
  slug: string;
  title: string;
  description: string;
  date: string;
  updated?: string;
  published: boolean;
  readMinutes: number;
  image: string;
  imageAlt: string;
  tags: string[];
  sections: PostSection[];
}

const POSTS: Post[] = [
  {
    slug: "how-much-snow-closes-school",
    title: "How Much Snow Does It Take to Close School?",
    description:
      "The answer changes a lot from place to place. Here is a simple guide to how many inches or centimetres it usually takes across the United States and Canada.",
    date: "2026-09-10",
    published: true,
    readMinutes: 6,
    image: "/blog/snow-inches.svg",
    imageAlt: "A snow ruler showing different snow depths for southern and northern cities",
    tags: ["Snow totals", "Regions"],
    sections: [
      {
        paragraphs: [
          "Kids ask this question every winter. The honest answer is that there is no single number. Two inches of snow can shut down every school in Atlanta. The same two inches in Buffalo is just a normal Tuesday.",
          "What really matters is how ready a town is for snow. Places that get a lot of snow buy more plows. They salt roads before the storm. Their drivers know how to handle slick streets. Places that rarely see snow do not have those tools, so a small storm is a big deal.",
        ],
      },
      {
        heading: "A rough guide by region",
        paragraphs: ["These numbers are general patterns we see in school closures. Your own district may be stricter or more relaxed."],
        list: [
          "Deep South (Georgia, Alabama, Texas, the Carolinas): 1 to 2 inches is often enough. Any ice at all can do it too.",
          "Mid-Atlantic (Virginia, Maryland, DC, Kentucky): about 2 to 4 inches, with ice making it more likely.",
          "Middle of the country (Ohio, Indiana, Missouri, Kansas): about 4 to 6 inches or a morning with bad ice.",
          "Great Lakes and New England (New York, Michigan, Massachusetts, Minnesota): usually 6 to 12 inches or dangerous cold.",
          "Ontario and Quebec: often 15 cm or more. Freezing rain can also do it. Many boards cancel buses but keep schools open.",
          "The Prairies (Alberta, Saskatchewan, Manitoba): schools rarely close for snow. Extreme cold and blizzard wind are the main reasons buses stop.",
          "Coastal British Columbia: just a few centimetres can close schools because it happens so rarely.",
        ],
      },
      {
        heading: "Timing matters more than the total",
        paragraphs: [
          "Ten inches that fall on a Saturday afternoon will not close school on Monday. Plows have all of Sunday to clean up. Three inches that fall between 3 AM and 7 AM on a school day is a different story. That is when bus drivers start their engines and when road crews are still behind.",
          "This is why our calculator looks at the hour by hour forecast. It adds extra points when snow falls in that pre-dawn window.",
        ],
      },
      {
        heading: "Ice beats snow",
        paragraphs: [
          "A quarter inch of freezing rain is often more dangerous than half a foot of fluffy snow. Plows can push snow away. They cannot scrape off a clear sheet of ice. Buses slide on bridges and hills. That is why a small ice storm can close more schools than a big snowstorm.",
        ],
      },
      {
        heading: "Cold alone can do it",
        paragraphs: [
          "In the northern states and in much of Canada, schools sometimes close with no new snow at all. When the wind chill gets low enough, skin can freeze in minutes. Kids waiting at a bus stop are at risk. Many northern districts have a set wind chill number where they cancel buses or school.",
        ],
        callout: "Quick tip: check our calculator the night before around 8 PM to 10 PM. The forecast for the next morning is usually at its most accurate then.",
      },
    ],
  },
  {
    slug: "snow-day-vs-delay-vs-bus-cancellation",
    title: "Snow Day, Delay or Bus Cancellation: What Is the Difference?",
    description:
      "A two hour delay, a closed school, a remote learning day and a bus cancellation are not the same thing. Here is what each one means for your family.",
    date: "2026-09-12",
    published: true,
    readMinutes: 5,
    image: "/blog/delay-vs-closure.svg",
    imageAlt: "A school bus and a clock showing a two hour delay",
    tags: ["Parents", "School rules"],
    sections: [
      {
        paragraphs: [
          "When winter weather hits, schools have more choices than just open or closed. Knowing the difference helps you plan your morning. It also helps you understand what our percentage really means.",
        ],
      },
      {
        heading: "Full closure (a real snow day)",
        paragraphs: [
          "The school building is closed and there are no classes. This is what most kids hope for. Districts often have to make these days up later in the year. Some add days in June. Others use extra days that were built into the calendar.",
        ],
      },
      {
        heading: "Two hour delay",
        paragraphs: [
          "School starts later than normal, often by two hours. Buses run later too. A delay gives plows and the sun time to clear roads. It is common when snow ends overnight or when roads are icy at dawn but should improve by mid morning.",
          "If our calculator shows a chance between about 20% and 50%, a delay is a real possibility even if a full closure is not.",
        ],
      },
      {
        heading: "Remote learning day",
        paragraphs: [
          "Since 2020, many districts can switch to online classes instead of closing. Kids log in from home. Some states call these flexible instruction days or e-learning days. They count as a school day, so there is nothing to make up later.",
          "If your district uses remote days, a high chance on our calculator may mean a laptop morning instead of a sledding morning.",
        ],
      },
      {
        heading: "Bus cancellation (very common in Canada)",
        paragraphs: [
          "In Ontario and some other provinces, school boards often cancel buses but keep schools open. Kids who walk or get a ride can still go to class. This happens a lot with freezing rain or fog on rural roads.",
          "So in places like Toronto or Ottawa, a high chance on our calculator often means buses are cancelled rather than every school being closed.",
        ],
      },
      {
        heading: "Early dismissal",
        paragraphs: [
          "Sometimes a storm arrives during the school day. Schools may send kids home early so buses can get them home before roads get bad. Our calculator focuses on the morning so it does not predict early dismissals.",
        ],
      },
      {
        heading: "Where to find the official answer",
        list: [
          "Your school district or school board website",
          "Text, email or phone alerts from the district (sign up at the start of the year)",
          "Your district's social media pages",
          "Local TV and radio stations that list closings",
          "School bus company websites in Canada, which post bus cancellations by area",
        ],
      },
    ],
  },
  {
    slug: "black-ice-why-freezing-rain-closes-schools",
    title: "Black Ice: Why a Little Freezing Rain Closes So Many Schools",
    description:
      "Freezing rain is the sneakiest winter weather. Learn what black ice is, why plows cannot fix it and why school leaders fear it more than snow.",
    date: "2026-09-14",
    published: true,
    readMinutes: 5,
    image: "/blog/black-ice.svg",
    imageAlt: "Raindrops freezing into a thin layer of ice on a road",
    tags: ["Ice", "Safety"],
    sections: [
      {
        paragraphs: [
          "Picture a road that looks wet but is actually covered in a thin, clear layer of ice. You cannot see it. Cars and buses cannot grip it. That is black ice. It is one of the top reasons schools close.",
        ],
      },
      {
        heading: "How freezing rain happens",
        paragraphs: [
          "Snow starts high up in the clouds. On the way down it can fall through a warm layer of air and melt into rain. If the air near the ground is below freezing, the rain drops get super cold. The moment they hit a cold road, car or tree, they freeze into ice.",
          "Weather forecasts call this freezing rain. If the drops are tiny it is called freezing drizzle. Both are bad news for school buses.",
        ],
      },
      {
        heading: "Why plows cannot help much",
        paragraphs: [
          "A plow blade pushes snow off the road. Ice is stuck to the road, so the blade just slides over it. Salt helps but it needs time to work. It also works poorly when the road gets very cold. Bridges and overpasses freeze first because cold air hits them from above and below.",
        ],
      },
      {
        heading: "Why timing is everything",
        paragraphs: [
          "Freezing rain that falls in the afternoon may melt by the next morning. Freezing rain that falls before sunrise is the worst case. The roads are at their coldest. Buses are heading out. There is no daylight to spot icy patches.",
          "That is why our calculator adds 30 points when it sees freezing rain or freezing drizzle between 3 AM and 7 AM. You will see a blue Black Ice Alert badge when this happens.",
        ],
      },
      {
        heading: "Staying safe on icy mornings",
        list: [
          "Walk like a penguin: small steps with your weight over your front foot.",
          "Wear boots with good grip instead of sneakers.",
          "Stand well back from the road at the bus stop.",
          "Give drivers extra time and space.",
          "If school is open, leave early and take it slow.",
        ],
      },
    ],
  },
  {
    slug: "snow-day-superstitions",
    title: "Snow Day Superstitions Kids Swear By (and the Real Science)",
    description:
      "Pajamas inside out, ice cubes down the toilet and a spoon under the pillow. Here are the most famous snow day rituals plus what really makes it snow.",
    date: "2026-09-16",
    published: true,
    readMinutes: 4,
    image: "/blog/superstitions.svg",
    imageAlt: "Inside out pajamas, a spoon and ice cubes on a snowy background",
    tags: ["Fun", "Kids"],
    sections: [
      {
        paragraphs: [
          "Every winter, kids all over North America try the same tricks to make a snow day happen. None of them change the weather. They are still a fun tradition. Here are the classics.",
        ],
      },
      {
        heading: "The famous rituals",
        list: [
          "Wear your pajamas inside out (and sometimes backwards too).",
          "Flush ice cubes down the toilet. Some say one cube for each inch you want.",
          "Sleep with a spoon under your pillow.",
          "Put a white crayon in the freezer.",
          "Do a snow dance right before bed.",
          "Run around the kitchen table a few times.",
        ],
        callout: "Please skip the ice cubes if your home has old pipes or a septic system. Your parents will thank you.",
      },
      {
        heading: "What really makes a snow day",
        paragraphs: [
          "Real snow needs two things: cold air and moisture. When a storm pulls wet air over cold ground, the water turns into snow crystals high in the sky. If the air stays below freezing all the way down, those crystals land as snow.",
          "For school to close, that snow usually has to land at the worst time. The big one is between 3 AM and 7 AM, right before buses leave. Wind that blows snow into drifts helps too. So does freezing rain that turns roads into ice.",
        ],
      },
      {
        heading: "A better ritual",
        paragraphs: [
          "Our favorite ritual is checking the Snow Day Calculator around 9 PM the night before. You get a real number based on the latest hour by hour forecast. Then you can decide if it is worth wearing those pajamas inside out.",
        ],
      },
    ],
  },
];

/** Newest first, drafts hidden. */
export async function getPublishedPosts(limit?: number): Promise<Post[]> {
  const list = POSTS.filter((p) => p.published).sort((a, b) => b.date.localeCompare(a.date));
  return typeof limit === "number" ? list.slice(0, limit) : list;
}

export async function getPostBySlug(slug: string): Promise<Post | undefined> {
  return POSTS.find((p) => p.slug === slug && p.published);
}
