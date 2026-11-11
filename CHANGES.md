# Site update: design system pass

Changed
- index.html: plain web logo (name + Look both ways tag), hero tag removed, overprint discs in the hero, linked supporters line with the CBF added, CBF acknowledgement block with logo, Google Fonts link removed.
- style.css: design system colours (white ground, no green or cream), Overpass, Big Shoulders Display and Boston Traffic, black text on pink buttons, zebra band on the footer, Memphis confetti removed, page focus outline fix, inner page spacing.
- thank-you.html: rebuilt in the new look (the old file was cut off mid-stylesheet).

Added
- fonts/ (7 font files, self-hosted)
- cbf-logo-white.png

Deleted
- secret.html (superseded old site)

Not touched
- admin/ (Decap CMS). Wiring it up is a separate round.
- shazma-gaffoor.html and shazma-gaffoor.css (keeps its own styling).

# Dashboard round (merged with the design system pass)

Changed
- admin/config.yml: rebuilt. Three editable sections: Announcements, Episodes, People. Edits save as drafts and go live when published (delete the publish_mode line to skip that).
- admin/index.html: page title, noindex.
- index.html: announcement slot at the top of Home, a new Episodes page with nav and footer links that stay hidden until an episode is set to show, People cards read from the dashboard (the written cards stay as a fallback), Netlify login script only loads from invite and password emails.
- style.css: styles for announcements, episodes, and the optional role and bio on person cards, kept to the design system (yellow as edge and tag only, pink buttons).

Added
- content/announcements.json, content/episodes.json, content/people.json
- images/uploads/ (where dashboard uploads go)

# Footer logos round

Changed
- index.html, volunteer.html, easy-read/about.html: CBF taken out of the "With support from" line. New logo row in the footer with the Auspicious Arts Projects logo and the C31 logo.
- index.html only: CBF logo (linked to cbf.org.au) and the set sentence from grant clause 14.2E, now in the logo row. Volunteer and Easy Read pages no longer carry the CBF block.
- style.css: .cbf-ack and .cbf-logo replaced with .partner-logos, .partner-logo and .cbf-line. All logos 56px tall. Auspicious logo has clear space of one "A" width, per their guidelines.

Added
- images/logos/auspicious-arts-projects-white.svg (from the Auspicious kit, unaltered)
- images/logos/c31-white.png (white C31 logo)
