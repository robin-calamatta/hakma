// Chrono Gate eras: the history (past) and frontier (future) of every subject.
// Each era: name, years, facts (townsfolk lines), qs ([q, answer, wrong1, wrong2, wrong3, explanation]).
const E = (name, years, facts, qs) => ({ name, years, facts, qs });

export const ERAS = {
  cs: {
    past: E('The Dawn of Computing', '1830s–1950s', ['Charles Babbage designed the Analytical Engine in 1837 — a mechanical general-purpose computer.', 'Ada Lovelace published the first algorithm meant for a machine in 1843.', 'ENIAC (1945) used about 18,000 vacuum tubes and filled a whole room.'], [
      ['Who published the first algorithm intended for a machine (Babbage\'s Analytical Engine)?', 'Ada Lovelace', 'Grace Hopper', 'Alan Turing', 'Charles Darwin', 'Her 1843 notes computed Bernoulli numbers.'],
      ['Alan Turing\'s 1936 paper described…', 'An abstract machine that can compute anything computable', 'The first smartphone', 'The World Wide Web', 'A steam engine', 'The Turing machine underpins computability theory.'],
      ['Early electronic computers like ENIAC switched using…', 'Vacuum tubes', 'Transistors', 'Microchips', 'Quantum bits', 'Transistors (1947) later replaced tubes.'],
      ['Grace Hopper is famous for…', 'Early compilers and popularising "debugging"', 'Inventing the mouse', 'Founding Google', 'The first video game', 'Her A-0 system (1952) was an early compiler.']]),
    future: E('The Quantum Horizon', 'Tomorrow', ['Quantum computers use qubits, which can be in a superposition of 0 and 1.', 'Shor\'s algorithm could break RSA on a large quantum computer, so post-quantum cryptography is being adopted.', 'Moore\'s law — transistor counts doubling about every two years — is slowing down.'], [
      ['A quantum computer\'s basic unit of information is the…', 'Qubit', 'Byte', 'Pixel', 'Neuron', 'Qubits use superposition and entanglement.'],
      ['Why does Shor\'s algorithm worry security experts?', 'It could factor large numbers fast, breaking RSA', 'It deletes passwords', 'It speeds up Wi-Fi', 'It makes CPUs overheat', 'Hence the move to post-quantum algorithms.'],
      ['Moore\'s law observed that transistor counts…', 'Double roughly every two years', 'Halve every year', 'Stay constant', 'Grow by 10 per year', 'Physical limits are slowing this trend.'],
      ['Post-quantum cryptography aims to…', 'Stay secure even against quantum computers', 'Run only on quantum computers', 'Remove encryption', 'Replace all passwords with emojis', 'NIST published its first standards in 2024.']]),
  },
  python: {
    past: E('Python\'s Origins', '1989–2008', ['Guido van Rossum began Python as a hobby project over the 1989 holidays; it was released in 1991.', 'The name comes from Monty Python\'s Flying Circus, not the snake.', 'Python 3 (2008) broke backward compatibility to fix old design mistakes; Python 2 reached end of life in 2020.'], [
      ['Who created Python?', 'Guido van Rossum', 'James Gosling', 'Linus Torvalds', 'Bjarne Stroustrup', 'He was Python\'s "Benevolent Dictator For Life" until 2018.'],
      ['Python is named after…', 'Monty Python\'s Flying Circus', 'A pet snake', 'A Greek god', 'A programming textbook', 'Hence jokes like "spam and eggs" in docs.'],
      ['Which version broke backward compatibility?', 'Python 3.0', 'Python 1.0', 'Python 2.7', 'Python 3.12', 'print became a function, strings became Unicode, and more.'],
      ['When did Python 2 reach end of life?', 'January 1, 2020', '2008', '1999', 'It is still supported', 'Projects had to migrate to Python 3.']]),
    future: E('Python Unbound', 'Tomorrow', ['PEP 703 makes the Global Interpreter Lock optional, opening the door to truly parallel threads.', 'Python 3.13 added an experimental JIT compiler.', 'Pyodide runs Python in the web browser using WebAssembly.'], [
      ['What does PEP 703 aim to make optional?', 'The Global Interpreter Lock (GIL)', 'Indentation', 'Type hints', 'The print function', 'A free-threaded build lets threads run in parallel.'],
      ['Pyodide lets Python run…', 'In the browser via WebAssembly', 'Only on supercomputers', 'Without any interpreter', 'Inside Excel only', 'Great for interactive teaching tools.'],
      ['What did Python 3.13 add experimentally to speed up code?', 'A JIT compiler', 'Pointers', 'A new syntax for loops', 'Manual memory management', 'It compiles hot code paths at runtime.'],
      ['Why are type hints growing in popularity?', 'Tools can catch bugs and editors give better help', 'Python requires them now', 'They make code run 10× faster', 'They replace tests', 'Type checkers like mypy read them.']]),
  },
  java: {
    past: E('The Green Project', '1991–2014', ['Java began in 1991 at Sun Microsystems as "Oak", led by James Gosling.', 'Released in 1995 with the slogan "Write once, run anywhere".', 'Oracle acquired Sun in 2010; Java 8 (2014) brought lambdas and streams.'], [
      ['Java\'s original name was…', 'Oak', 'Coffee', 'Pine', 'Bean', 'It was renamed Java before release.'],
      ['Who led the creation of Java?', 'James Gosling', 'Guido van Rossum', 'Dennis Ritchie', 'Ada Lovelace', 'At Sun Microsystems.'],
      ['Java\'s famous slogan?', '"Write once, run anywhere"', '"Move fast and break things"', '"There\'s more than one way to do it"', '"Think different"', 'Thanks to the JVM running bytecode.'],
      ['Which release added lambdas and streams?', 'Java 8 (2014)', 'Java 1.0', 'Java 5', 'Java 21', 'A huge modernisation of the language.']]),
    future: E('Project Frontier', 'Tomorrow', ['Since 2018, Java ships a new version every six months, with LTS releases every two years.', 'Virtual threads (Project Loom, Java 21) make millions of concurrent tasks practical.', 'Project Valhalla is bringing value classes for faster, flatter data.'], [
      ['How often does Java release a new version now?', 'Every six months', 'Every ten years', 'Every week', 'Never again', 'LTS releases come every two years.'],
      ['Project Loom delivered…', 'Virtual threads', 'Generics', 'The JVM', 'Applets', 'Final in Java 21.'],
      ['GraalVM native image lets Java apps…', 'Compile ahead-of-time into fast-starting native executables', 'Run only in browsers', 'Skip compilation entirely', 'Use Python syntax', 'Useful for serverless and CLIs.'],
      ['Project Valhalla focuses on…', 'Value classes for memory-efficient data', 'A new logo', 'Removing the garbage collector', 'GUI toolkits', 'Objects without identity can be stored flat.']]),
  },
  golang: {
    past: E('The Google Origins', '2007–2012', ['Go was designed at Google in 2007 by Robert Griesemer, Rob Pike and Ken Thompson.', 'It was open-sourced in 2009.', 'Go 1.0 (2012) came with a compatibility promise: Go 1 code keeps compiling.'], [
      ['Which company created Go?', 'Google', 'Microsoft', 'Apple', 'Sun Microsystems', 'Designed to make large-scale software simpler.'],
      ['Ken Thompson, one of Go\'s designers, also co-created…', 'Unix', 'Windows', 'Java', 'Python', 'He also worked on B, a predecessor of C.'],
      ['What did Go 1.0 promise?', 'Backward compatibility for Go 1 programs', 'A new syntax every year', 'No garbage collector', 'Only Windows support', 'This stability helped adoption.'],
      ['Go\'s mascot is the…', 'Gopher', 'Duke', 'Penguin', 'Snake', 'Designed by Renée French.']]),
    future: E('The Modern Gopher', 'Tomorrow', ['Generics arrived in Go 1.18 (2022) after years of debate.', 'Range-over-function iterators came in Go 1.23.', 'Profile-guided optimisation (PGO) lets real production profiles guide the compiler.'], [
      ['Which Go version added generics?', 'Go 1.18', 'Go 1.0', 'Go 1.5', 'Go 2.0', 'Released in 2022.'],
      ['Profile-guided optimisation uses…', 'Real CPU profiles to guide compilation', 'Random guesses', 'Manual assembly', 'A second compiler', 'Often gives a few percent speed-up.'],
      ['Go can target WebAssembly using…', 'GOOS/GOARCH settings like GOARCH=wasm', 'A Python plugin', 'Only the cloud', 'It cannot', 'Go programs can run in browsers.'],
      ['Why is Go popular for cloud tools like Docker and Kubernetes?', 'Fast static binaries and easy concurrency', 'It has no types', 'It runs only on Macs', 'It needs a VM', 'Single binaries are easy to ship.']]),
  },
  softeng: {
    past: E('The Software Crisis', '1968–2001', ['The term "software engineering" took off at a 1968 NATO conference about a "software crisis".', 'Fred Brooks wrote in 1975: adding people to a late project makes it later.', 'The Agile Manifesto was written in 2001 in Snowbird, Utah.'], [
      ['"Adding manpower to a late software project makes it later" is…', 'Brooks\'s law', 'Moore\'s law', 'Murphy\'s law', 'Conway\'s law', 'From The Mythical Man-Month (1975).'],
      ['The Agile Manifesto was written in…', '2001', '1968', '1990', '2015', 'Seventeen developers met in Utah.'],
      ['The famous 1994 "Gang of Four" book is about…', 'Design patterns', 'Databases', 'Networking', 'Game design', 'It catalogued 23 patterns.'],
      ['Which conference popularised the term "software engineering"?', 'The 1968 NATO conference', 'The first Google I/O', 'The 1991 WWW conference', 'CES 1975', 'It addressed the "software crisis".']]),
    future: E('The AI-Assisted Era', 'Tomorrow', ['AI assistants now write first drafts of code — engineers review, test and design.', 'Platform engineering builds internal "paved roads" so teams ship safely.', 'Formal verification mathematically proves critical code is correct.'], [
      ['With AI coding assistants, what stays essential for engineers?', 'Reviewing, testing and understanding the code', 'Nothing — AI does it all', 'Typing faster', 'Avoiding version control', 'You\'re responsible for what ships.'],
      ['Platform engineering mainly provides…', 'Self-service internal tools and paved paths for developers', 'Hardware repairs', 'Marketing websites', 'Office furniture', 'Golden paths reduce cognitive load.'],
      ['Formal verification means…', 'Mathematically proving software meets its specification', 'Running a quick smoke test', 'Getting a manager\'s signature', 'Writing comments', 'Used for chips, OS kernels and crypto.'],
      ['Conway\'s law says systems mirror…', 'The communication structure of the organisation', 'Moore\'s law', 'The CPU layout', 'The programming language', 'Team boundaries shape architecture.']]),
  },
  devops: {
    past: E('Dev Meets Ops', '2008–2016', ['"10+ Deploys Per Day" (Flickr, 2009) showed dev and ops working together.', 'Patrick Debois organised the first DevOpsDays in Ghent in 2009.', 'Google\'s Site Reliability Engineering book (2016) shared how Google runs production.'], [
      ['Where was the first DevOpsDays held (2009)?', 'Ghent, Belgium', 'Toronto', 'Tokyo', 'Seattle', 'Organised by Patrick Debois.'],
      ['The 2009 Flickr talk was titled…', '"10+ Deploys Per Day"', '"Never Deploy on Fridays"', '"Ops Is Dead"', '"Waterfall Forever"', 'It showed dev and ops cooperating.'],
      ['Google\'s approach that treats operations as a software problem is…', 'Site Reliability Engineering (SRE)', 'Waterfall', 'ITIL v1', 'Pair programming', 'SREs automate away toil.'],
      ['The novel "The Phoenix Project" (2013) teaches…', 'DevOps principles through a story', 'Medieval history', 'Python syntax', 'Accounting law', 'Followed by "The Unicorn Project".']]),
    future: E('Autonomous Operations', 'Tomorrow', ['GitOps: Git is the single source of truth, and agents reconcile clusters to match it.', 'eBPF lets you observe and secure the Linux kernel without changing app code.', 'Platform teams and AI-assisted ops (AIOps) cut toil and alert noise.'], [
      ['In GitOps, the desired state of the system lives in…', 'A Git repository', 'An engineer\'s memory', 'A sticky note', 'The load balancer', 'Agents like Argo CD or Flux sync it.'],
      ['eBPF is used for…', 'Safe, programmable observability and networking in the Linux kernel', 'Writing CSS', 'Billing', 'Video editing', 'Tools like Cilium build on it.'],
      ['AIOps aims to…', 'Use machine learning to reduce alert noise and spot incidents', 'Replace all monitoring with guesses', 'Remove on-call forever', 'Write marketing copy', 'Correlating signals across systems.'],
      ['Policy as code means…', 'Security and compliance rules are written and tested as code', 'Policies stored in emails', 'Laws printed on servers', 'No policies at all', 'E.g. OPA/Rego rules in CI.']]),
  },
  kubernetes: {
    past: E('From Borg to Kubernetes', '2003–2015', ['Google ran containers at scale with an internal system called Borg.', 'Kubernetes was announced in 2014 and reached 1.0 in 2015, donated to the new CNCF.', '"Kubernetes" is Greek for helmsman or pilot; k8s = k + 8 letters + s.'], [
      ['Kubernetes was inspired by Google\'s internal system called…', 'Borg', 'Cube', 'Hive', 'Matrix', 'Its lessons shaped Kubernetes\' design.'],
      ['"Kubernetes" comes from the Greek word for…', 'Helmsman / pilot', 'Container', 'Cloud', 'Robot', 'Hence the ship\'s-wheel logo.'],
      ['Why is it written "k8s"?', '8 letters between the k and the s', 'Version 8', 'It has 8 components', 'It was released in 2008', 'A numeronym, like i18n.'],
      ['Which foundation hosts Kubernetes?', 'Cloud Native Computing Foundation (CNCF)', 'Apache Foundation', 'Mozilla', 'Red Cross', 'Created in 2015 under the Linux Foundation.']]),
    future: E('The Cloud-Native Future', 'Tomorrow', ['The Gateway API is the modern successor to Ingress for routing traffic.', 'Clusters increasingly schedule GPUs for AI/ML workloads.', 'WebAssembly workloads promise tiny, fast-starting sandboxes next to containers.'], [
      ['The modern, more expressive successor to Ingress is the…', 'Gateway API', 'Pod API', 'Batch API', 'Helm API', 'It went GA in 2023.'],
      ['Why are GPUs increasingly scheduled in Kubernetes?', 'To run AI and machine-learning workloads', 'To render the dashboard', 'For faster DNS', 'To replace etcd', 'Device plugins expose GPUs to pods.'],
      ['WebAssembly workloads are attractive because they…', 'Start extremely fast in small sandboxes', 'Need no CPU', 'Run only on Windows', 'Replace YAML', 'Useful for edge and serverless.'],
      ['Knative adds what to Kubernetes?', 'Serverless features like scale-to-zero', 'A new kernel', 'A database', 'Paper documentation', 'Pods scale down to zero when idle.']]),
  },
  terraform: {
    past: E('The Infrastructure Revolution', '2012–2021', ['HashiCorp was founded in 2012 by Mitchell Hashimoto and Armon Dadgar.', 'Terraform launched in 2014 using HCL, HashiCorp Configuration Language.', 'Terraform 1.0 arrived in 2021 with stability guarantees.'], [
      ['Which company created Terraform?', 'HashiCorp', 'Amazon', 'Google', 'Microsoft', 'Also known for Vagrant, Vault and Consul.'],
      ['Terraform\'s configuration language is…', 'HCL', 'YAML only', 'COBOL', 'SQL', 'HashiCorp Configuration Language.'],
      ['Terraform first launched in…', '2014', '1995', '2008', '2020', 'It reached 1.0 in 2021.'],
      ['Before IaC, servers were often…', 'Configured by hand, causing drift and "snowflake" servers', 'Always identical', 'Fully automated', 'Grown in labs', 'IaC makes them reproducible.']]),
    future: E('Open Infrastructure', 'Tomorrow', ['After Terraform moved to a source-available licence in 2023, the community forked it as OpenTofu.', 'CDK for Terraform lets you write infrastructure in TypeScript, Python, Go and more.', 'Policy as code and AI assistants help review plans before apply.'], [
      ['OpenTofu is…', 'An open-source fork of Terraform under the Linux Foundation', 'A cooking app', 'A Kubernetes plugin', 'A new cloud provider', 'Created after the 2023 licence change.'],
      ['CDK for Terraform lets you…', 'Define infrastructure in general-purpose languages', 'Run Terraform without providers', 'Skip plans', 'Edit state by hand', 'It synthesises Terraform configuration.'],
      ['Why review a plan with policy as code?', 'To block insecure or non-compliant changes automatically', 'To make apply slower', 'To delete state', 'To rename providers', 'E.g. Sentinel or OPA checks.'],
      ['The safest future workflow is still…', 'Plan, review, then apply', 'Apply directly to prod', 'Edit the cloud console', 'Delete the state file', 'Automation doesn\'t remove review.']]),
  },
  electrical: {
    past: E('The War of the Currents', '1800–1900', ['Alessandro Volta built the first battery, the voltaic pile, in 1800.', 'Michael Faraday discovered electromagnetic induction in 1831.', 'Edison promoted DC; Tesla and Westinghouse promoted AC — AC won for long-distance power.'], [
      ['Who built the first electrical battery (1800)?', 'Alessandro Volta', 'Thomas Edison', 'Nikola Tesla', 'Isaac Newton', 'The volt is named after him.'],
      ['Faraday discovered that a changing magnetic field…', 'Induces a voltage', 'Stops all current', 'Creates gravity', 'Freezes wires', 'The basis of generators and transformers.'],
      ['Who championed alternating current (AC)?', 'Nikola Tesla and George Westinghouse', 'Thomas Edison', 'Benjamin Franklin', 'James Watt', 'AC can be stepped up with transformers.'],
      ['Why did AC win for long-distance transmission?', 'Transformers make high-voltage, low-loss transmission easy', 'It is always safer', 'It needs no wires', 'It is invisible', 'Higher voltage means lower current and losses.']]),
    future: E('The Smart Grid', 'Tomorrow', ['Smart grids balance solar, wind and batteries in real time.', 'Vehicle-to-grid lets EVs send power back during peaks.', 'HVDC lines carry power hundreds of kilometres with low losses.'], [
      ['Vehicle-to-grid (V2G) means…', 'EV batteries can feed power back to the grid', 'Cars run on rails', 'Grids made of cars', 'Charging only at night', 'Parked EVs become distributed storage.'],
      ['Why does a grid with lots of solar need storage?', 'Solar output drops at night and on cloudy days', 'Panels need cooling', 'Batteries make panels brighter', 'It doesn\'t', 'Storage shifts energy to when it\'s needed.'],
      ['HVDC transmission is used for…', 'Very long distances and undersea cables', 'House wiring', 'Phone chargers only', 'Lighting bulbs', 'Lower losses over long runs.'],
      ['A smart meter can…', 'Report usage in near real time', 'Generate electricity', 'Replace breakers', 'Store gas', 'Enables time-of-use pricing.']]),
  },
  automotive: {
    past: E('The Horseless Carriage', '1886–1960', ['Karl Benz\'s 1886 Patent-Motorwagen is considered the first practical automobile.', 'Ford\'s moving assembly line (1913) made the Model T affordable.', 'Volvo engineer Nils Bohlin invented the three-point seat belt in 1959 and Volvo shared the patent freely.'], [
      ['The first practical automobile (1886) was built by…', 'Karl Benz', 'Henry Ford', 'Elon Musk', 'Enzo Ferrari', 'The Benz Patent-Motorwagen.'],
      ['What did Ford\'s 1913 moving assembly line change?', 'Cars became affordable through mass production', 'Cars got wings', 'Engines ran on water', 'Cars became electric', 'Model T build time dropped dramatically.'],
      ['Before electric starters (1912), engines were started by…', 'A hand crank', 'A key fob', 'Solar power', 'A phone app', 'Cranking could break your arm if it kicked back.'],
      ['The modern three-point seat belt came from…', 'Volvo (Nils Bohlin, 1959)', 'NASA', 'Ford', 'Tesla', 'Volvo opened the patent to everyone.']]),
    future: E('The Electric Autobahn', 'Tomorrow', ['SAE defines driving automation from Level 0 (none) to Level 5 (full).', 'Solid-state batteries promise more range and faster charging.', 'Hydrogen fuel-cell vehicles emit only water vapour.'], [
      ['SAE Level 5 automation means…', 'The car can drive itself everywhere, in all conditions', 'Cruise control only', 'Lane-keeping only', 'No automation', 'Level 0 = no automation.'],
      ['A hydrogen fuel-cell car\'s tailpipe emits…', 'Water vapour', 'Black smoke', 'Carbon monoxide', 'Nothing at all ever', 'The fuel cell combines hydrogen and oxygen.'],
      ['Solid-state batteries replace the liquid electrolyte with…', 'A solid electrolyte', 'Gasoline', 'Air', 'Water', 'Potentially safer and more energy-dense.'],
      ['Over-the-air (OTA) updates let cars…', 'Get new software without a dealer visit', 'Fly', 'Refuel remotely', 'Change colour', 'Like phone updates.']]),
  },
  finance: {
    past: E('From Barter to Banks', '600 BC–1935', ['The Lydians minted some of the first coins around 600 BC.', 'China\'s Song dynasty issued some of the first paper money.', 'The Amsterdam Stock Exchange (1602) traded shares of the Dutch East India Company; the Bank of Canada opened in 1935.'], [
      ['Before money, people traded goods directly. This is called…', 'Barter', 'Credit', 'Taxation', 'Inflation', 'Money solved the "double coincidence of wants".'],
      ['Some of the earliest coins were minted in…', 'Lydia (modern Turkey), around 600 BC', 'Canada, 1867', 'Rome, AD 1500', 'Japan, 1900', 'Made of electrum, a gold-silver alloy.'],
      ['The world\'s first major stock exchange was in…', 'Amsterdam (1602)', 'New York (1950)', 'Toronto (2000)', 'Paris (1990)', 'It traded Dutch East India Company shares.'],
      ['When did the Bank of Canada begin operations?', '1935', '1867', '1990', '1700', 'It was created by an act in 1934.']]),
    future: E('The Digital Economy', 'Tomorrow', ['Central bank digital currencies (CBDCs) are being researched worldwide.', 'Real-time payments move money in seconds, any time of day.', 'Open banking lets you securely share your bank data with apps you choose.'], [
      ['A CBDC is…', 'A digital currency issued by a central bank', 'A credit card brand', 'A stock index', 'A tax form', 'Different from private cryptocurrencies.'],
      ['Open banking lets customers…', 'Securely share their financial data with approved apps', 'Rob banks', 'Avoid all fees forever', 'Print money', 'With consent, through secure APIs.'],
      ['A robo-advisor is…', 'Software that builds and rebalances investment portfolios automatically', 'A bank robot guard', 'A stock exchange', 'A tax auditor', 'Usually with low fees.'],
      ['Real-time payment systems mean…', 'Money transfers settle in seconds, 24/7', 'Only weekday transfers', 'Cheques only', 'Payments take a month', 'Many countries are building them.']]),
  },
  networking: {
    past: E('The ARPANET Days', '1969–1991', ['ARPANET sent its first message between UCLA and Stanford in 1969 — the system crashed after "LO".', 'ARPANET switched to TCP/IP on January 1, 1983.', 'Tim Berners-Lee invented the World Wide Web at CERN; it went public in 1991.'], [
      ['The first ARPANET message (1969) crashed after which letters?', '"LO" (from "LOGIN")', '"HELLO"', '"WWW"', '"OK"', 'Sent from UCLA to Stanford.'],
      ['When did ARPANET switch to TCP/IP?', 'January 1, 1983', '1969', '1995', '2001', 'Often called the internet\'s birthday.'],
      ['Who invented the World Wide Web?', 'Tim Berners-Lee', 'Vint Cerf', 'Bill Gates', 'Steve Jobs', 'At CERN, 1989–1991.'],
      ['Vint Cerf and Bob Kahn are famous for designing…', 'TCP/IP', 'Wi-Fi', 'HTML', 'Ethernet', 'The "fathers of the internet".']]),
    future: E('The Hyperconnected Horizon', 'Tomorrow', ['IPv6 adoption keeps rising as IPv4 addresses ran out.', 'Satellite constellations in low Earth orbit bring broadband to remote places.', 'Researchers are building quantum networks that use entanglement for ultra-secure keys.'], [
      ['Why is IPv6 adoption growing?', 'IPv4 addresses ran out', 'IPv6 is shorter', 'IPv4 is illegal', 'Wi-Fi requires it', '128-bit addresses.'],
      ['Low-Earth-orbit satellite internet mainly improves…', 'latency compared with geostationary satellites', 'cable speeds', 'DNS caching', 'battery life', 'Closer satellites = shorter trips.'],
      ['Quantum key distribution promises…', 'keys whose interception can be detected', 'faster downloads', 'free bandwidth', 'no need for routers', 'Measuring disturbs quantum states.'],
      ['Wi-Fi 7 (802.11be) adds…', 'multi-link operation and wider channels', 'WEP security', 'copper cables', 'dial-up', 'Faster, more reliable wireless.']]),
  },
  security: {
    past: E('Codebreakers & Worms', '1940s–1990s', ['Codebreakers at Bletchley Park, including Alan Turing, broke the Enigma cipher in WWII.', 'Diffie and Hellman published public-key exchange in 1976; RSA followed in 1977.', 'The 1988 Morris worm infected about 10% of the early internet.'], [
      ['Which WWII cipher did Bletchley Park break?', 'Enigma', 'AES', 'RSA', 'Caesar', 'Alan Turing helped build the Bombe.'],
      ['Public-key exchange was published in 1976 by…', 'Diffie and Hellman', 'Turing and Lovelace', 'Gates and Allen', 'Berners-Lee', 'A revolution in cryptography.'],
      ['The 1988 Morris worm is famous because…', 'it was one of the first worms to spread across the internet', 'it encrypted files for ransom', 'it was harmless', 'it attacked phones', 'It led to the first CERT.'],
      ['The Caesar cipher works by…', 'shifting each letter a fixed number of places', 'using public keys', 'hashing words', 'random noise', 'Easily broken.']]),
    future: E('The Post-Quantum Frontier', 'Tomorrow', ['NIST published its first post-quantum cryptography standards in 2024.', 'Passkeys are replacing passwords with phishing-resistant logins.', 'Zero-trust architectures verify every request instead of trusting the network.'], [
      ['Post-quantum cryptography protects against…', 'future quantum computers breaking today\'s public-key crypto', 'viruses', 'slow Wi-Fi', 'spam', 'NIST standards from 2024.'],
      ['Passkeys resist phishing because…', 'they are cryptographically bound to the real website', 'they are long passwords', 'they are sent by SMS', 'they never expire', 'Fake sites can\'t use them.'],
      ['Zero trust means…', 'never trust, always verify', 'trust the internal network', 'no passwords', 'no encryption', 'Every request checked.'],
      ['"Harvest now, decrypt later" refers to…', 'storing encrypted data today to break with quantum computers later', 'backup strategies', 'farming', 'cookie policies', 'Why migration starts now.']]),
  },
  french: {
    past: E('Old France', '842–1635', ['French grew out of the Latin spoken by ordinary Romans in Gaul.', 'The Oaths of Strasbourg (842) are one of the earliest texts in an early form of French.', 'The Académie française was founded in 1635 to guard the language.'], [
      ['French developed mainly from…', 'Latin', 'Greek', 'German', 'Arabic', 'Vulgar (everyday) Latin spoken in Gaul.'],
      ['The Académie française was founded in…', '1635', '1900', '842', '2001', 'Under Cardinal Richelieu.'],
      ['The 1539 Ordinance of Villers-Cotterêts made French…', 'The language of official legal documents instead of Latin', 'Illegal', 'The language of Spain', 'Only spoken in Paris', 'A milestone for French.'],
      ['Québec City was founded by Samuel de Champlain in…', '1608', '1867', '1492', '1950', 'Bringing French to North America.']]),
    future: E('La Francophonie de demain', 'Tomorrow', ['French is spoken by over 300 million people on five continents.', 'Most future French speakers are expected to live in Africa.', 'Québec\'s language office coins French words like "courriel" (email).'], [
      ['Where will most French speakers live in the future?', 'Africa', 'Antarctica', 'Australia', 'Iceland', 'Thanks to young, growing populations.'],
      ['"Courriel", promoted in Québec, means…', 'Email', 'Courier pigeon', 'Courtyard', 'Running', 'From "courrier électronique".'],
      ['The international organisation of French-speaking countries is…', 'La Francophonie (OIF)', 'NATO', 'The EU', 'FIFA', 'It has dozens of member states.'],
      ['How many people speak French worldwide (approx.)?', 'Over 300 million', 'About 5 million', 'Exactly 1 billion', 'Fewer than 1 million', 'One of the most widely taught languages.']]),
  },
  spanish: {
    past: E('El Siglo de Oro', '1200–1713', ['Spanish (Castilian) grew from Latin in the kingdom of Castile.', 'Antonio de Nebrija published a Castilian grammar in 1492 — one of the first for a European vernacular language.', 'Cervantes published Don Quixote in 1605; the Real Academia Española was founded in 1713.'], [
      ['Spanish is also called…', 'Castellano (Castilian)', 'Latino', 'Iberian', 'Andalusí', 'After the kingdom of Castile.'],
      ['Who wrote Don Quixote (1605)?', 'Miguel de Cervantes', 'Pablo Neruda', 'Gabriel García Márquez', 'Lope de Vega', 'Often called the first modern novel.'],
      ['The Real Academia Española (RAE) was founded in…', '1713', '1492', '1975', '1066', 'Its motto: "Limpia, fija y da esplendor".'],
      ['The letter ñ came from…', 'Scribes abbreviating "nn" with a tilde', 'Greek', 'A printing error in 2000', 'Arabic numerals', 'Año comes from Latin "annus".']]),
    future: E('El español global', 'Tomorrow', ['Spanish has the second-most native speakers in the world, about half a billion.', 'The United States has one of the largest Spanish-speaking populations anywhere.', 'The RAE adds new words to its dictionary regularly, including tech terms.'], [
      ['Spanish ranks where for native speakers worldwide?', 'Second', 'First', 'Tenth', 'Fiftieth', 'Behind Mandarin Chinese.'],
      ['Mixing Spanish and English in conversation is often called…', 'Spanglish', 'Franglais', 'Pidgin', 'Esperanto', 'Common in the US.'],
      ['Which country has the most Spanish speakers?', 'Mexico', 'Spain', 'Argentina', 'Chile', 'Over 120 million people.'],
      ['How many native Spanish speakers are there (approx.)?', 'About 500 million', 'About 5 million', 'About 50,000', 'About 5 billion', 'Plus many millions of learners.']]),
  },
  maltese: {
    past: E('Melita Antika', '870–1934', ['Maltese grew from the Arabic of Sicily and Malta (Siculo-Arabic) after Arab rule began in 870.', 'The oldest known Maltese text is "Il-Kantilena" by Pietru Caxaro, from the 1400s.', 'The Knights of St John (1530–1798) brought Italian influence; British rule (1800–1964) brought English words.'], [
      ['Maltese developed mainly from…', 'Siculo-Arabic', 'Latin', 'Greek', 'English', 'With heavy Italian and English borrowing later.'],
      ['The oldest known Maltese literary text is…', 'Il-Kantilena (Pietru Caxaro, 15th century)', 'Don Quixote', 'The Odyssey', 'A 1990 newspaper', 'A short poem.'],
      ['Which order ruled Malta from 1530 to 1798?', 'The Knights of St John', 'The Vikings', 'The Aztecs', 'The Mongols', 'They built Valletta.'],
      ['Maltese became an official language of Malta in…', '1934', '870', '2020', '1530', 'Alongside English.']]),
    future: E('Malti Diġitali', 'Tomorrow', ['Maltese became an official EU language when Malta joined in 2004.', 'About half a million people speak Maltese.', 'Researchers build Maltese speech recognition and machine translation to keep it thriving online.'], [
      ['When did Maltese become an official EU language?', '2004', '1964', '1934', '2024', 'When Malta joined the European Union.'],
      ['About how many people speak Maltese?', 'About 500,000', 'About 50 million', 'About 500', 'About 5 billion', 'A small but strong language community.'],
      ['Maltese is unique in the EU because it is…', 'The only official EU language of Semitic origin', 'Written in Cyrillic', 'Not written down', 'Spoken only by robots', 'And it uses the Latin alphabet.'],
      ['Why build Maltese speech and translation tools?', 'So the language thrives in the digital world', 'To replace Maltese', 'To ban English', 'No reason', 'Small languages need digital support.']]),
  },
  math: {
    past: E('The Ancient Mathematicians', '2000 BC–1202', ['The Babylonians counted in base 60 — that\'s why an hour has 60 minutes.', 'Euclid\'s Elements (around 300 BC) organised geometry from basic axioms.', 'Al-Khwarizmi\'s name gave us "algorithm"; his book gave us "algebra". Fibonacci spread Hindu-Arabic numerals in Europe in 1202.'], [
      ['Why do we have 60 minutes in an hour?', 'The Babylonians used base 60', 'It was random', 'Because of 6 days', 'Computers chose it', 'Base 60 divides nicely by 2, 3, 4, 5 and 6.'],
      ['"Algorithm" comes from the name of…', 'Al-Khwarizmi', 'Euclid', 'Pythagoras', 'Newton', 'A 9th-century scholar in Baghdad.'],
      ['Euclid\'s Elements is famous for…', 'Geometry built from axioms', 'Inventing calculus', 'Discovering zero', 'The first computer', 'Used as a textbook for over 2,000 years.'],
      ['Who brought Hindu-Arabic numerals (0–9) to wide use in Europe?', 'Fibonacci (1202)', 'Julius Caesar', 'Archimedes', 'Ada Lovelace', 'In his book Liber Abaci.']]),
    future: E('The Proof Machines', 'Tomorrow', ['The Four Colour Theorem (1976) was the first major theorem proved with a computer.', 'Proof assistants like Lean check every step of a proof by computer.', 'The Riemann Hypothesis is still unsolved — with a $1 million prize.'], [
      ['The first major theorem proved with heavy computer help was…', 'The Four Colour Theorem', 'Pythagoras\'s theorem', '1 + 1 = 2', 'The area of a circle', 'Proved by Appel and Haken in 1976.'],
      ['A proof assistant like Lean…', 'Checks every logical step of a proof by computer', 'Guesses answers', 'Only does arithmetic', 'Replaces numbers', 'Mathematicians use it to verify research.'],
      ['Modern encryption relies heavily on…', 'Prime numbers and number theory', 'Fractions', 'Roman numerals', 'Tally marks', 'Factoring huge numbers is hard.'],
      ['The Riemann Hypothesis is…', 'A famous unsolved problem with a $1 million prize', 'Solved in 1900', 'About triangles only', 'A computer virus', 'One of the Millennium Prize Problems.']]),
  },
  ela: {
    past: E('From Beowulf to the Dictionary', '700–1828', ['Beowulf is written in Old English, which looks almost foreign today.', 'Gutenberg\'s printing press (around 1440) — and Caxton\'s in England (1476) — helped standardise spelling.', 'Samuel Johnson published his dictionary in 1755; Noah Webster\'s American dictionary came in 1828.'], [
      ['Beowulf is written in…', 'Old English', 'Modern English', 'Latin', 'French', 'It dates from roughly 700–1000 AD.'],
      ['Who wrote The Canterbury Tales in Middle English?', 'Geoffrey Chaucer', 'William Shakespeare', 'Jane Austen', 'J.K. Rowling', 'Late 1300s.'],
      ['The printing press helped English by…', 'Spreading books and standardising spelling', 'Banning books', 'Inventing emojis', 'Removing grammar', 'Caxton printed in England from 1476.'],
      ['Why do Americans spell "color" without a u?', 'Noah Webster simplified spellings in his 1828 dictionary', 'A typo', 'British law', 'Shakespeare did it', 'Also "center" and "theater".']]),
    future: E('Language Unleashed', 'Tomorrow', ['Dictionaries add hundreds of new words every year as language changes.', 'An emoji (😂) was Oxford Dictionaries\' Word of the Year in 2015.', 'AI writing tools can draft text — good writers still edit for voice, accuracy and purpose.'], [
      ['Oxford Dictionaries\' 2015 Word of the Year was…', 'An emoji (😂)', '"Selfie"', '"Robot"', '"Book"', '"Selfie" won in 2013.'],
      ['New words enter the dictionary because…', 'Enough people use them over time', 'A king decides', 'They are random', 'They never do', 'Language is shaped by its speakers.'],
      ['When using AI writing tools, a good writer still…', 'Edits for accuracy, voice and purpose', 'Never reads the output', 'Copies it without credit', 'Avoids all revision', 'You own the final words.'],
      ['"Lol" and "brb" are examples of…', 'Internet abbreviations / textspeak', 'Latin phrases', 'Poetic meter', 'Punctuation marks', 'Informal registers keep evolving.']]),
  },
  science: {
    past: E('The Age of Discovery', '1600–1911', ['Galileo used a telescope in 1610 to discover four moons of Jupiter.', 'Isaac Newton described gravity and the laws of motion in 1687.', 'Marie Curie won Nobel Prizes in both physics (1903) and chemistry (1911).'], [
      ['Galileo used a telescope to discover…', 'Four moons of Jupiter', 'Electricity', 'DNA', 'Germs', 'Now called the Galilean moons.'],
      ['Who described universal gravitation in 1687?', 'Isaac Newton', 'Albert Einstein', 'Charles Darwin', 'Galileo Galilei', 'In his book Principia.'],
      ['Marie Curie won Nobel Prizes in…', 'Physics and chemistry', 'Literature and peace', 'Medicine only', 'Economics', 'The first person to win two Nobels.'],
      ['Charles Darwin\'s famous 1859 book was about…', 'Evolution by natural selection', 'Gravity', 'Electricity', 'Volcanoes', 'On the Origin of Species.']]),
    future: E('The New Frontiers', 'Tomorrow', ['The James Webb Space Telescope (launched 2021) sees light from the earliest galaxies.', 'Scientists are working toward fusion power — the energy source of the Sun.', 'Space agencies are planning crewed missions to the Moon and Mars.'], [
      ['The James Webb Space Telescope mainly observes in…', 'Infrared light', 'Sound', 'X-rays only', 'Radio only', 'Infrared sees through dust and very distant galaxies.'],
      ['Fusion power works by…', 'Joining light atoms together, like in the Sun', 'Splitting uranium', 'Burning coal', 'Using wind', 'Fission splits atoms; fusion joins them.'],
      ['Why are scientists interested in Mars?', 'It may hold signs of past water and life', 'It is made of cheese', 'It is closer than the Moon', 'It has oceans today', 'Rovers study ancient riverbeds.'],
      ['Renewable energy sources include…', 'Solar, wind and hydro', 'Coal and oil', 'Gasoline', 'Natural gas only', 'They are naturally replenished.']]),
  },
  physics: {
    past: E('The Classical & Quantum Revolutions', '1687–1911', ['Newton\'s Principia (1687) set out the laws of motion and gravity.', 'James Clerk Maxwell united electricity, magnetism and light in the 1860s.', 'In 1905 Einstein published special relativity and his explanation of the photoelectric effect.'], [
      ['Maxwell\'s equations unified…', 'Electricity, magnetism and light', 'Biology and chemistry', 'Gravity and sound', 'Heat and money', 'Light is an electromagnetic wave.'],
      ['Einstein\'s Nobel Prize (1921) was for…', 'The photoelectric effect', 'Relativity', 'The atomic bomb', 'Gravity waves', 'Relativity was still controversial.'],
      ['Rutherford\'s gold-foil experiment (1911) revealed…', 'A tiny, dense atomic nucleus', 'The electron', 'Quarks', 'The Big Bang', 'Most of an atom is empty space.'],
      ['Newton\'s first law is about…', 'Inertia', 'Thermodynamics', 'Relativity', 'Quantum spin', 'Objects keep their motion unless a force acts.']]),
    future: E('Beyond the Standard Model', 'Tomorrow', ['LIGO detected gravitational waves for the first time in 2015.', 'In 2022 the National Ignition Facility achieved fusion ignition — more energy out than the laser put in.', 'Dark matter and dark energy make up most of the universe, but we still don\'t know what they are.'], [
      ['LIGO first detected gravitational waves in…', '2015', '1905', '1687', '2030', 'From two merging black holes.'],
      ['Fusion "ignition" at NIF (2022) meant…', 'More fusion energy out than laser energy in', 'A fire in the lab', 'A new element', 'Cold fusion', 'A milestone toward fusion power.'],
      ['Roughly how much of the universe is ordinary matter?', 'About 5%', 'About 95%', '100%', '50%', 'The rest is dark matter and dark energy.'],
      ['Quantum entanglement means…', 'Particles share linked states even when far apart', 'Tangled wires', 'Faster-than-light phone calls', 'Magnets sticking', 'It can\'t send messages faster than light.']]),
  },
  chemistry: {
    past: E('From Alchemy to Atoms', '1780–1911', ['Lavoisier showed mass is conserved in chemical reactions.', 'John Dalton proposed modern atomic theory around 1803.', 'Dmitri Mendeleev published the periodic table in 1869 — leaving gaps for undiscovered elements.'], [
      ['Who created the periodic table (1869)?', 'Dmitri Mendeleev', 'Marie Curie', 'Isaac Newton', 'Robert Boyle', 'He predicted missing elements correctly.'],
      ['Lavoisier is known for showing that…', 'Mass is conserved in chemical reactions', 'Gold can be made from lead', 'Atoms are indivisible', 'Water is an element', 'Often called the father of modern chemistry.'],
      ['Alchemists mainly tried to…', 'Turn base metals into gold', 'Build computers', 'Split atoms', 'Make plastics', 'Their lab methods helped start chemistry.'],
      ['Marie Curie discovered the elements…', 'Polonium and radium', 'Oxygen and hydrogen', 'Iron and gold', 'Helium and neon', 'Polonium is named after Poland.']]),
    future: E('The Green Lab', 'Tomorrow', ['The 2019 Nobel Prize in Chemistry honoured the lithium-ion battery.', 'Green chemistry designs processes that avoid hazardous waste.', 'Element 118, oganesson, is the heaviest element named so far (2016).'], [
      ['The 2019 Chemistry Nobel celebrated…', 'The lithium-ion battery', 'Plastic bags', 'Gunpowder', 'Steel', 'It powers phones and EVs.'],
      ['Green chemistry aims to…', 'Reduce hazardous chemicals and waste', 'Make everything green', 'Ban chemistry', 'Use more fossil fuels', 'Designing safer reactions from the start.'],
      ['The heaviest element named so far is…', 'Oganesson (118)', 'Uranium (92)', 'Gold (79)', 'Lead (82)', 'Named in 2016.'],
      ['Carbon capture tries to…', 'Trap CO₂ before or after it reaches the air', 'Make diamonds only', 'Remove oxygen', 'Freeze the oceans', 'One tool against climate change.']]),
  },
  biology: {
    past: E('The Cell Pioneers', '1665–1953', ['Robert Hooke named "cells" in 1665 after looking at cork.', 'Gregor Mendel discovered the rules of heredity with pea plants.', 'The DNA double helix was described in 1953 by Watson and Crick, using Rosalind Franklin\'s X-ray data.'], [
      ['Who first used the word "cell" (1665)?', 'Robert Hooke', 'Charles Darwin', 'Louis Pasteur', 'Gregor Mendel', 'Cork reminded him of monks\' cells.'],
      ['Mendel studied heredity using…', 'Pea plants', 'Fruit flies', 'Bacteria', 'Mice', 'He found dominant and recessive traits.'],
      ['Whose X-ray images were key to finding DNA\'s shape?', 'Rosalind Franklin', 'Marie Curie', 'Ada Lovelace', 'Jane Goodall', 'Her "Photo 51" showed the helix.'],
      ['Alexander Fleming discovered penicillin in…', '1928', '1665', '2001', '1859', 'The first widely used antibiotic.']]),
    future: E('The Genome Age', 'Tomorrow', ['The Human Genome Project finished mapping human DNA in 2003.', 'CRISPR gene editing earned the 2020 Nobel Prize in Chemistry.', 'mRNA vaccines teach cells to make a harmless protein that trains the immune system.'], [
      ['CRISPR is a tool for…', 'Editing genes precisely', 'Taking photos of cells', 'Counting bacteria', 'Measuring blood pressure', 'Doudna and Charpentier won the 2020 Nobel.'],
      ['mRNA vaccines work by…', 'Giving cells instructions to make a harmless protein that trains immunity', 'Changing your DNA', 'Containing live virus', 'Killing all bacteria', 'The mRNA breaks down quickly.'],
      ['The Human Genome Project finished in…', '2003', '1953', '1865', '2030', 'It mapped about 20,000 genes.'],
      ['Synthetic biology means…', 'Designing and building new biological parts and systems', 'Plastic animals', 'Robots made of metal', 'Studying fossils only', 'E.g. microbes engineered to make medicines.']]),
  },
};
const SET = { systemdesign: 'devops', cybersec: 'security', hacking: 'security', trading: 'finance', electrician: 'electrical', 'math-elem': 'math', 'math-middle': 'math', 'math-high': 'math', 'ela-elem': 'ela', 'ela-high': 'ela', 'science-elem': 'science' };
export const eraSetFor = (topicId) => ERAS[SET[topicId] || topicId] || ERAS.cs;
