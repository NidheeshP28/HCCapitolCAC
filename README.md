# CoolSpot: Heat-Relief Site Planning
*Built by Nidheesh Pusuluri*

CoolSpot is a computational engine that helps counties decide where to set up cooling centers before heat waves. It was built first for people at the highest risk during extreme heat: older adults, people without air conditioning, and people with chronic conditions that make heat especially dangerous.

## Motivation

Southern India is one of the hottest regions in the country. During the summer months, temperatures often climb above 40°C, and heat waves are becoming more frequent and intense. Many of the people most affected are farmers and daily wage workers who spend long hours outdoors, as well as older adults and people with chronic illnesses who have little access to air conditioning or a cool place to rest.

Heat is a serious health risk in the state. Heat stroke, dehydration, and heat-related illness can be fatal, and they tend to hit hardest in rural villages and low-income urban neighborhoods where homes are built with tin roofs or concrete that trap heat, and where public cooling spaces are scarce. Many people also lack reliable electricity during peak afternoon hours, which makes it harder to keep cool at home.

This is where CoolSpot comes in

## Flow

1. Select a county in the US and the number of centers.
2. Load population with households without AC.
3. Identify available sites such as libraries, schools, community centers, etc.
4. Use a maximum coverage algorithm to select locations.
5. View covered and uncovered ZIP areas on the map.

## Technical Complexity

CoolSpot connects to the **maximum coverage problem**, an optimization challenge focused on choosing a fixed number of locations to reach as many people as possible.

- **Greedy:** Selects the site that reaches the most vulnerable people not yet covered. Under standard assumptions, it has a theoretical guarantee of at least 63.2% of the optimal coverage.
- **Exact optimization:** Uses integer programming with the PuLP library to find the optimal solution when one can be solved to completion.
- **Comparison:** Measures the difference between the greedy and exact solutions.
- **And more...**

## Planning Page

The second page is more detailed and lets planners, such as county officials, public health staff, and community members, read, adjust, and review proposed plans.

- Move, add, or remove sites and change coverage radii.
- Set budgets and cooling capacity per site.
- Compare planning methods and search algorithms.
- View site details, hours, accessibility notes, and contact information.
- Save checklists and generate briefing PDFs.

## Data Sources

| Data | Source |
|---|---|
| Heat vulnerability (age, housing, health) | [CDC/ATSDR Social Vulnerability Index](https://www.atsdr.cdc.gov/place-health/php/svi/index.html) and [US Census American Community Survey](https://www.census.gov/programs-surveys/acs) |
| Candidate facilities | [OpenStreetMap](https://www.openstreetmap.org/) and public datasets |
| ZIP boundaries | [US Census Bureau](https://www2.census.gov/geo/tiger/GENZ2020/shp/cb_2020_us_zcta520_500k.zip) |
| Basemap | Esri World Light Gray Canvas |

## Limitations

- Coverage uses straight-line distance, not road travel time or walking routes.
- The selected radius may overestimate how far people can travel during a heat wave, especially older adults.
- Census and SVI data are updated periodically, so vulnerability estimates may lag current conditions.
- Residents are represented by ZIP-level points rather than individual locations.
- Candidate facilities are not verified for cooling capacity, accessibility, staffing, or availability during emergencies.
- This is a planning estimate, not an official county recommendation.
- During a heat emergency, do not rely on this app. Call 911 if someone is showing signs of heat stroke or is in danger.