import fs from "fs";
import path from "path";
import type { Transcript } from "../lib/types";
import type { GoldStandard } from "../lib/eval/match";

const evalTranscriptsDir = path.join(process.cwd(), "data", "eval", "transcripts");
const goldPath = path.join(process.cwd(), "data", "eval", "gold.json");

if (!fs.existsSync(evalTranscriptsDir)) {
  fs.mkdirSync(evalTranscriptsDir, { recursive: true });
}

interface RawEvalSpec {
  id: string;
  split: "dev" | "test";
  title: string;
  date: string;
  customerCompany: string;
  customerName: string;
  customerRole: string;
  lines: { speaker: "vendor" | "customer"; text: string }[];
  commitments: {
    lineIndex: number;
    quote: string;
    type: string;
    catalogItemId: string;
    dueDays: number | null;
  }[];
  decoys: {
    lineIndex: number;
    quote: string;
    kind: "discussed" | "product_description" | "customer_request" | "other";
  }[];
  dependencies: {
    lineIndex: number;
    quote: string;
  }[];
}

const specs: RawEvalSpec[] = [
  // ── DEV SET (e01 - e05) ──────────────────────────────────────────
  {
    id: "e01",
    split: "dev",
    title: "Apex Climate Care discovery call",
    date: "2026-04-01",
    customerCompany: "Apex Climate Care",
    customerName: "Derek Miller",
    customerRole: "Operations Director",
    lines: [
      { speaker: "customer", text: "We need automated dispatching for twenty field vans across the state." },
      { speaker: "vendor", text: "Brightpath handles fleet routing easily, and we can configure your accounts." },
      { speaker: "vendor", text: "We will have your SAML single sign-on live within two weeks of signature." },
      { speaker: "customer", text: "That fits our IT requirement. How quickly can you train our dispatchers?" },
      { speaker: "vendor", text: "We provide two admin training sessions completed within seven days of onboarding." },
      { speaker: "customer", text: "Can we also get custom analytics reports for van fuel usage?" },
      { speaker: "vendor", text: "We could probably look into custom report builders down the road, let me check." },
      { speaker: "vendor", text: "Our mobile application works seamlessly on both iOS and Android devices." },
      { speaker: "customer", text: "Great. We will send your team our technician roster by next Tuesday." },
    ],
    commitments: [
      { lineIndex: 2, quote: "We will have your SAML single sign-on live within two weeks of signature.", type: "integration", catalogItemId: "int_sso", dueDays: 14 },
      { lineIndex: 4, quote: "We provide two admin training sessions completed within seven days of onboarding.", type: "training", catalogItemId: "trn_admin", dueDays: 7 },
    ],
    decoys: [
      { lineIndex: 6, quote: "We could probably look into custom report builders down the road, let me check.", kind: "discussed" },
      { lineIndex: 7, quote: "Our mobile application works seamlessly on both iOS and Android devices.", kind: "product_description" },
    ],
    dependencies: [
      { lineIndex: 8, quote: "We will send your team our technician roster by next Tuesday." },
    ],
  },
  {
    id: "e02",
    split: "dev",
    title: "Pinnacle Elevators scope alignment",
    date: "2026-04-02",
    customerCompany: "Pinnacle Elevators",
    customerName: "Rachel Scott",
    customerRole: "Service VP",
    lines: [
      { speaker: "customer", text: "We have historical maintenance records for three hundred commercial elevators." },
      { speaker: "vendor", text: "Our data team regularly handles elevator service log migrations." },
      { speaker: "vendor", text: "We can handle the CSV migration within thirty days of contract signature." },
      { speaker: "customer", text: "Do you have emergency pager integrations for trapped passengers?" },
      { speaker: "vendor", text: "We could explore automated pager integrations down the road with product." },
      { speaker: "customer", text: "What is the overall target date for the initial rollout?" },
      { speaker: "vendor", text: "We target full go-live within forty-five days of signing the agreement." },
      { speaker: "customer", text: "Understood. We will provide our equipment inventory file by the fifteenth." },
    ],
    commitments: [
      { lineIndex: 2, quote: "We can handle the CSV migration within thirty days of contract signature.", type: "data_migration", catalogItemId: "mig_csv", dueDays: 30 },
      { lineIndex: 6, quote: "We target full go-live within forty-five days of signing the agreement.", type: "timeline", catalogItemId: "tl_golive_standard", dueDays: 45 },
    ],
    decoys: [
      { lineIndex: 4, quote: "We could explore automated pager integrations down the road with product.", kind: "discussed" },
    ],
    dependencies: [
      { lineIndex: 7, quote: "We will provide our equipment inventory file by the fifteenth." },
    ],
  },
  {
    id: "e03",
    split: "dev",
    title: "AquaFlow Plumbing commercial kickoff",
    date: "2026-04-03",
    customerCompany: "AquaFlow Plumbing",
    customerName: "Mark Hernandez",
    customerRole: "Chief Estimator",
    lines: [
      { speaker: "customer", text: "Our technicians handle commercial backflow testing and residential repairs." },
      { speaker: "vendor", text: "Our workflow engine easily supports multi-tier job categorization." },
      { speaker: "vendor", text: "We will deliver up to ten workflow configurations within fourteen days." },
      { speaker: "customer", text: "How does the dispatch schedule handle priority emergency leaks?" },
      { speaker: "vendor", text: "Our dispatch engine uses advanced routing algorithms to optimize drive times." },
      { speaker: "customer", text: "Is twenty-four seven weekend support included in our standard tier?" },
      { speaker: "vendor", text: "Let me check with the team about weekend support packages after this call." },
      { speaker: "customer", text: "Sounds fair. We look forward to seeing the draft agreement." },
    ],
    commitments: [
      { lineIndex: 2, quote: "We will deliver up to ten workflow configurations within fourteen days.", type: "configuration", catalogItemId: "cfg_workflows", dueDays: 14 },
    ],
    decoys: [
      { lineIndex: 4, quote: "Our dispatch engine uses advanced routing algorithms to optimize drive times.", kind: "product_description" },
      { lineIndex: 6, quote: "Let me check with the team about weekend support packages after this call.", kind: "discussed" },
    ],
    dependencies: [],
  },
  {
    id: "e04",
    split: "dev",
    title: "Beacon Fire & Security requirements",
    date: "2026-04-04",
    customerCompany: "Beacon Fire & Security",
    customerName: "Chloe Nguyen",
    customerRole: "Compliance Manager",
    lines: [
      { speaker: "customer", text: "All inspection records must sync directly into our CRM accounts." },
      { speaker: "vendor", text: "Our standard CRM connector synchronizes accounts, contacts, and work orders." },
      { speaker: "vendor", text: "We will have the standard CRM sync connector live within twenty-one days." },
      { speaker: "customer", text: "We also need our lead technicians trained on compliance logging." },
      { speaker: "vendor", text: "We will provide two sessions of admin training in the first week." },
      { speaker: "customer", text: "Can we have custom inspection certificates rendered automatically?" },
      { speaker: "vendor", text: "In theory we can build custom dashboards, but let me confirm the effort." },
      { speaker: "customer", text: "We will send over our CRM API credentials and test tenant access tomorrow." },
    ],
    commitments: [
      { lineIndex: 2, quote: "We will have the standard CRM sync connector live within twenty-one days.", type: "integration", catalogItemId: "int_crm_sync", dueDays: 21 },
      { lineIndex: 4, quote: "We will provide two sessions of admin training in the first week.", type: "training", catalogItemId: "trn_admin", dueDays: 7 },
    ],
    decoys: [
      { lineIndex: 6, quote: "In theory we can build custom dashboards, but let me confirm the effort.", kind: "discussed" },
    ],
    dependencies: [
      { lineIndex: 7, quote: "We will send over our CRM API credentials and test tenant access tomorrow." },
    ],
  },
  {
    id: "e05",
    split: "dev",
    title: "SunPeak Solar review",
    date: "2026-04-05",
    customerCompany: "SunPeak Solar Installations",
    customerName: "Lucas Wright",
    customerRole: "Field Ops Lead",
    lines: [
      { speaker: "customer", text: "We require SAML single sign-on for our eighty field crew members." },
      { speaker: "vendor", text: "We support Okta and Azure AD through standard SAML two-point-zero." },
      { speaker: "vendor", text: "SAML single sign-on will be delivered within ten days of contract signing." },
      { speaker: "customer", text: "What is our overall target go-live date for the field teams?" },
      { speaker: "vendor", text: "We commit to standard go-live implementation within forty-five days." },
      { speaker: "customer", text: "Can the system ingest aerial drone roof measurements?" },
      { speaker: "vendor", text: "I will ask engineering if we can support drone telemetry later this year." },
      { speaker: "customer", text: "Understood, that sounds like a good plan for phase one." },
    ],
    commitments: [
      { lineIndex: 2, quote: "SAML single sign-on will be delivered within ten days of contract signing.", type: "integration", catalogItemId: "int_sso", dueDays: 10 },
      { lineIndex: 4, quote: "We commit to standard go-live implementation within forty-five days.", type: "timeline", catalogItemId: "tl_golive_standard", dueDays: 45 },
    ],
    decoys: [
      { lineIndex: 6, quote: "I will ask engineering if we can support drone telemetry later this year.", kind: "discussed" },
    ],
    dependencies: [],
  },

  // ── TEST SET (e06 - e20) ─────────────────────────────────────────
  {
    id: "e06",
    split: "test",
    title: "BlueSky Refrigeration proposal",
    date: "2026-04-06",
    customerCompany: "BlueSky Refrigeration",
    customerName: "Julian Vance",
    customerRole: "Technical Director",
    lines: [
      { speaker: "customer", text: "We have five years of cold-storage equipment histories stored in CSV files." },
      { speaker: "vendor", text: "We can handle the CSV migration within thirty days of contract signature." },
      { speaker: "customer", text: "Can we get custom refrigeration failure trend reports?" },
      { speaker: "vendor", text: "We could probably look at custom reports, let me check with engineering." },
      { speaker: "customer", text: "Security compliance requires SAML SSO integration before technicians log in." },
      { speaker: "vendor", text: "SAML single sign-on will be live within fourteen days of signing." },
      { speaker: "customer", text: "Excellent. We will send the legacy export file by next Monday." },
      { speaker: "vendor", text: "Perfect, our implementation team will ingest it as soon as received." },
    ],
    commitments: [
      { lineIndex: 1, quote: "We can handle the CSV migration within thirty days of contract signature.", type: "data_migration", catalogItemId: "mig_csv", dueDays: 30 },
      { lineIndex: 5, quote: "SAML single sign-on will be live within fourteen days of signing.", type: "integration", catalogItemId: "int_sso", dueDays: 14 },
    ],
    decoys: [
      { lineIndex: 3, quote: "We could probably look at custom reports, let me check with engineering.", kind: "discussed" },
    ],
    dependencies: [
      { lineIndex: 6, quote: "We will send the legacy export file by next Monday." },
    ],
  },
  {
    id: "e07",
    split: "test",
    title: "Vanguard Medical calibration review",
    date: "2026-04-07",
    customerCompany: "Vanguard Medical Tech",
    customerName: "Dr. Andrea Morris",
    customerRole: "Quality Director",
    lines: [
      { speaker: "customer", text: "Hospital biomedical equipment requires strict calibration protocol tracking." },
      { speaker: "vendor", text: "We will configure up to ten custom workflows within fourteen days." },
      { speaker: "customer", text: "Our staff requires dedicated admin instruction on compliance audits." },
      { speaker: "vendor", text: "We will deliver two admin training sessions completed within seven days." },
      { speaker: "customer", text: "Is the cloud platform certified for ninety-nine point nine uptime?" },
      { speaker: "vendor", text: "Our cloud platform maintains ninety-nine point nine percent uptime across all regions." },
      { speaker: "customer", text: "Could we also automate hospital biomedical compliance PDF sign-offs?" },
      { speaker: "vendor", text: "We could see if custom calibration reports are doable in a future sprint." },
    ],
    commitments: [
      { lineIndex: 1, quote: "We will configure up to ten custom workflows within fourteen days.", type: "configuration", catalogItemId: "cfg_workflows", dueDays: 14 },
      { lineIndex: 3, quote: "We will deliver two admin training sessions completed within seven days.", type: "training", catalogItemId: "trn_admin", dueDays: 7 },
    ],
    decoys: [
      { lineIndex: 5, quote: "Our cloud platform maintains ninety-nine point nine percent uptime across all regions.", kind: "product_description" },
      { lineIndex: 7, quote: "We could see if custom calibration reports are doable in a future sprint.", kind: "discussed" },
    ],
    dependencies: [],
  },
  {
    id: "e08",
    split: "test",
    title: "TerraGreen Landscaping review",
    date: "2026-04-08",
    customerCompany: "TerraGreen Landscaping",
    customerName: "Sean Gallagher",
    customerRole: "General Manager",
    lines: [
      { speaker: "customer", text: "We manage seasonal mowing and fertilization for twelve municipal parks." },
      { speaker: "vendor", text: "Our field service platform is ideal for recurring grounds maintenance." },
      { speaker: "vendor", text: "We will have the standard CRM sync connector live within twenty-one days." },
      { speaker: "customer", text: "When can we realistically expect to go live for the spring season?" },
      { speaker: "vendor", text: "We commit to full go-live implementation within forty-five days of signing." },
      { speaker: "customer", text: "Can we receive automated weather rain delay notifications?" },
      { speaker: "vendor", text: "Maybe we could do customized weather alerts later, I will inquire." },
      { speaker: "customer", text: "We will assign our lead dispatcher to coordinate the schedule tomorrow." },
    ],
    commitments: [
      { lineIndex: 2, quote: "We will have the standard CRM sync connector live within twenty-one days.", type: "integration", catalogItemId: "int_crm_sync", dueDays: 21 },
      { lineIndex: 4, quote: "We commit to full go-live implementation within forty-five days of signing.", type: "timeline", catalogItemId: "tl_golive_standard", dueDays: 45 },
    ],
    decoys: [
      { lineIndex: 6, quote: "Maybe we could do customized weather alerts later, I will inquire.", kind: "discussed" },
    ],
    dependencies: [
      { lineIndex: 7, quote: "We will assign our lead dispatcher to coordinate the schedule tomorrow." },
    ],
  },
  {
    id: "e09",
    split: "test",
    title: "Ironclad Heavy Cranes alignment",
    date: "2026-04-09",
    customerCompany: "Ironclad Heavy Cranes",
    customerName: "Marcus Brody",
    customerRole: "Safety Chief",
    lines: [
      { speaker: "customer", text: "Crane inspections must bill directly into our general ledger system." },
      { speaker: "vendor", text: "We will have the accounting sync standard connector live within fourteen days." },
      { speaker: "customer", text: "Our operators require single sign-on through our corporate Azure domain." },
      { speaker: "vendor", text: "SAML single sign-on will be live within ten days of contract execution." },
      { speaker: "customer", text: "Can we capture live crane boom angle telemetry via Bluetooth?" },
      { speaker: "vendor", text: "Let me consult the product team about GPS sensor webhooks for crane telemetry." },
      { speaker: "customer", text: "Understood. The rest of the terms look solid." },
    ],
    commitments: [
      { lineIndex: 1, quote: "We will have the accounting sync standard connector live within fourteen days.", type: "integration", catalogItemId: "int_accounting", dueDays: 14 },
      { lineIndex: 3, quote: "SAML single sign-on will be live within ten days of contract execution.", type: "integration", catalogItemId: "int_sso", dueDays: 10 },
    ],
    decoys: [
      { lineIndex: 5, quote: "Let me consult the product team about GPS sensor webhooks for crane telemetry.", kind: "discussed" },
    ],
    dependencies: [],
  },
  {
    id: "e10",
    split: "test",
    title: "ClearPath Telecom scoping",
    date: "2026-04-10",
    customerCompany: "ClearPath Telecom",
    customerName: "Valerie Cole",
    customerRole: "Network Ops VP",
    lines: [
      { speaker: "customer", text: "We have fiber splice histories and cable run data in CSV spreadsheets." },
      { speaker: "vendor", text: "We can handle the CSV migration within thirty days of contract signature." },
      { speaker: "customer", text: "Can field crews scan optical fiber equipment barcodes with their cameras?" },
      { speaker: "vendor", text: "Our tablet app supports barcode scanning out of the box on iOS." },
      { speaker: "customer", text: "Can we generate batch PDF export invoices for municipal clients?" },
      { speaker: "vendor", text: "We could probably support batch PDF invoices, let me follow up with engineering." },
      { speaker: "customer", text: "We will provide our route fiber maps by Friday afternoon." },
    ],
    commitments: [
      { lineIndex: 1, quote: "We can handle the CSV migration within thirty days of contract signature.", type: "data_migration", catalogItemId: "mig_csv", dueDays: 30 },
    ],
    decoys: [
      { lineIndex: 3, quote: "Our tablet app supports barcode scanning out of the box on iOS.", kind: "product_description" },
      { lineIndex: 5, quote: "We could probably support batch PDF invoices, let me follow up with engineering.", kind: "discussed" },
    ],
    dependencies: [
      { lineIndex: 6, quote: "We will provide our route fiber maps by Friday afternoon." },
    ],
  },
  {
    id: "e11",
    split: "test",
    title: "Metro Clean Industrial call",
    date: "2026-04-11",
    customerCompany: "Metro Clean Industrial",
    customerName: "Trevor Stone",
    customerRole: "Operations Lead",
    lines: [
      { speaker: "customer", text: "We clean food processing plants and need customized sanitization checklist templates." },
      { speaker: "vendor", text: "We will configure up to ten custom workflows within fourteen days." },
      { speaker: "customer", text: "Our shift supervisors need dedicated admin walkthrough sessions." },
      { speaker: "vendor", text: "We will provide two admin training sessions completed within seven days." },
      { speaker: "customer", text: "Could shift supervisors customize their tablet roster view on the fly?" },
      { speaker: "vendor", text: "I will check if we can adjust the mobile shift views in an upcoming patch." },
      { speaker: "customer", text: "Fair enough. That covers our primary requirements." },
    ],
    commitments: [
      { lineIndex: 1, quote: "We will configure up to ten custom workflows within fourteen days.", type: "configuration", catalogItemId: "cfg_workflows", dueDays: 14 },
      { lineIndex: 3, quote: "We will provide two admin training sessions completed within seven days.", type: "training", catalogItemId: "trn_admin", dueDays: 7 },
    ],
    decoys: [
      { lineIndex: 5, quote: "I will check if we can adjust the mobile shift views in an upcoming patch.", kind: "discussed" },
    ],
    dependencies: [],
  },
  {
    id: "e12",
    split: "test",
    title: "Shield Pest Control kickoff",
    date: "2026-04-12",
    customerCompany: "Shield Pest Control",
    customerName: "Fiona Martinez",
    customerRole: "Branch Manager",
    lines: [
      { speaker: "customer", text: "We service four hundred commercial accounts across three regional branches." },
      { speaker: "vendor", text: "Our multi-branch dispatching coordinates regional technician routes effectively." },
      { speaker: "vendor", text: "We commit to standard go-live implementation within forty-five days." },
      { speaker: "customer", text: "Can we track chemical pesticide batch numbers on work orders?" },
      { speaker: "vendor", text: "We could look at chemical inventory tracking next quarter with product." },
      { speaker: "customer", text: "We will need single sign-on configured for all office dispatchers." },
      { speaker: "vendor", text: "SAML single sign-on will be live within fourteen days of signing." },
      { speaker: "customer", text: "We will send over our complete branch and technician directory by Wednesday." },
    ],
    commitments: [
      { lineIndex: 2, quote: "We commit to standard go-live implementation within forty-five days.", type: "timeline", catalogItemId: "tl_golive_standard", dueDays: 45 },
      { lineIndex: 6, quote: "SAML single sign-on will be live within fourteen days of signing.", type: "integration", catalogItemId: "int_sso", dueDays: 14 },
    ],
    decoys: [
      { lineIndex: 4, quote: "We could look at chemical inventory tracking next quarter with product.", kind: "discussed" },
    ],
    dependencies: [
      { lineIndex: 7, quote: "We will send over our complete branch and technician directory by Wednesday." },
    ],
  },
  {
    id: "e13",
    split: "test",
    title: "Zenith Wind Services discussion",
    date: "2026-04-13",
    customerCompany: "Zenith Wind Services",
    customerName: "Lars Lindstrom",
    customerRole: "Operations VP",
    lines: [
      { speaker: "customer", text: "Our wind turbine techs work in remote mountain areas without cellular reception." },
      { speaker: "vendor", text: "Our platform architecture handles offline queuing seamlessly on all mobile apps." },
      { speaker: "customer", text: "We need our maintenance logs synced into Salesforce CRM." },
      { speaker: "vendor", text: "We will have the standard CRM sync connector live within twenty-one days." },
      { speaker: "customer", text: "We also have turbine inspection spreadsheets that need importing." },
      { speaker: "vendor", text: "We can handle the CSV migration within thirty days of contract signature." },
      { speaker: "customer", text: "Can we pull real-time turbine vibration alerts via SCADA integration?" },
      { speaker: "vendor", text: "Perhaps we can evaluate SCADA integration later, but it is not in current scope." },
    ],
    commitments: [
      { lineIndex: 3, quote: "We will have the standard CRM sync connector live within twenty-one days.", type: "integration", catalogItemId: "int_crm_sync", dueDays: 21 },
      { lineIndex: 5, quote: "We can handle the CSV migration within thirty days of contract signature.", type: "data_migration", catalogItemId: "mig_csv", dueDays: 30 },
    ],
    decoys: [
      { lineIndex: 1, quote: "Our platform architecture handles offline queuing seamlessly on all mobile apps.", kind: "product_description" },
      { lineIndex: 7, quote: "Perhaps we can evaluate SCADA integration later, but it is not in current scope.", kind: "discussed" },
    ],
    dependencies: [],
  },
  {
    id: "e14",
    split: "test",
    title: "Prime Catering Repair session",
    date: "2026-04-14",
    customerCompany: "Prime Catering Repair",
    customerName: "Anthony Russo",
    customerRole: "Service Manager",
    lines: [
      { speaker: "customer", text: "We repair commercial convection ovens, fryers, and dishwashers for hotels." },
      { speaker: "vendor", text: "We will provide two admin training sessions completed within seven days." },
      { speaker: "customer", text: "What is the timeline for rolling this out to our service fleet?" },
      { speaker: "vendor", text: "We commit to standard go-live implementation within forty-five days." },
      { speaker: "customer", text: "Can the system look up manufacturer oven warranties automatically?" },
      { speaker: "vendor", text: "We might be able to add equipment warranty lookups in a later release." },
      { speaker: "customer", text: "We will compile and send over our technician contact roster by tomorrow." },
      { speaker: "vendor", text: "Great, we will use that to configure the technician dispatch accounts." },
    ],
    commitments: [
      { lineIndex: 1, quote: "We will provide two admin training sessions completed within seven days.", type: "training", catalogItemId: "trn_admin", dueDays: 7 },
      { lineIndex: 3, quote: "We commit to standard go-live implementation within forty-five days.", type: "timeline", catalogItemId: "tl_golive_standard", dueDays: 45 },
    ],
    decoys: [
      { lineIndex: 5, quote: "We might be able to add equipment warranty lookups in a later release.", kind: "discussed" },
    ],
    dependencies: [
      { lineIndex: 6, quote: "We will compile and send over our technician contact roster by tomorrow." },
    ],
  },
  {
    id: "e15",
    split: "test",
    title: "StormShield Roofing call",
    date: "2026-04-15",
    customerCompany: "StormShield Roofing",
    customerName: "Cynthia Alvarez",
    customerRole: "CFO",
    lines: [
      { speaker: "customer", text: "Invoicing and payment milestone tracking must integrate into QuickBooks." },
      { speaker: "vendor", text: "We will have the accounting sync standard connector live within fourteen days." },
      { speaker: "customer", text: "We also need inspection report workflows tailored for insurance claims." },
      { speaker: "vendor", text: "We will configure up to ten custom workflows within fourteen days." },
      { speaker: "customer", text: "Can we store high-resolution aerial drone roof damage photography?" },
      { speaker: "vendor", text: "Let me verify with our team about drone aerial photo storage limits." },
      { speaker: "customer", text: "Okay, let us know what the cloud photo storage policy is." },
    ],
    commitments: [
      { lineIndex: 1, quote: "We will have the accounting sync standard connector live within fourteen days.", type: "integration", catalogItemId: "int_accounting", dueDays: 14 },
      { lineIndex: 3, quote: "We will configure up to ten custom workflows within fourteen days.", type: "configuration", catalogItemId: "cfg_workflows", dueDays: 14 },
    ],
    decoys: [
      { lineIndex: 5, quote: "Let me verify with our team about drone aerial photo storage limits.", kind: "discussed" },
    ],
    dependencies: [],
  },
  {
    id: "e16",
    split: "test",
    title: "PureWater Systems sync",
    date: "2026-04-16",
    customerCompany: "PureWater Systems",
    customerName: "David O'Connor",
    customerRole: "IT Lead",
    lines: [
      { speaker: "customer", text: "Water filtration technicians require SSO login and historical sample imports." },
      { speaker: "vendor", text: "SAML single sign-on will be live within ten days of contract signing." },
      { speaker: "customer", text: "We have two thousand historical lab water quality tests in CSV files." },
      { speaker: "vendor", text: "We can handle the CSV migration within thirty days of contract signature." },
      { speaker: "customer", text: "Can we automatically generate State EPA compliance certificates?" },
      { speaker: "vendor", text: "In theory we could build custom compliance exports, let me check." },
      { speaker: "customer", text: "We will send over our historical test dataset by the end of next week." },
    ],
    commitments: [
      { lineIndex: 1, quote: "SAML single sign-on will be live within ten days of contract signing.", type: "integration", catalogItemId: "int_sso", dueDays: 10 },
      { lineIndex: 3, quote: "We can handle the CSV migration within thirty days of contract signature.", type: "data_migration", catalogItemId: "mig_csv", dueDays: 30 },
    ],
    decoys: [
      { lineIndex: 5, quote: "In theory we could build custom compliance exports, let me check.", kind: "discussed" },
    ],
    dependencies: [
      { lineIndex: 6, quote: "We will send over our historical test dataset by the end of next week." },
    ],
  },
  {
    id: "e17",
    split: "test",
    title: "SecureDoor Automation review",
    date: "2026-04-17",
    customerCompany: "SecureDoor Automation",
    customerName: "Gary Perkins",
    customerRole: "VP Installations",
    lines: [
      { speaker: "customer", text: "We install automatic sliding doors for supermarkets and retail centers." },
      { speaker: "vendor", text: "Our platform offers instant push notifications to dispatchers on iOS and Android." },
      { speaker: "customer", text: "What is the timeline to have all four regional centers live on Brightpath?" },
      { speaker: "vendor", text: "We commit to standard go-live implementation within forty-five days." },
      { speaker: "customer", text: "Can we connect RFID door sensors directly into work order dispatches?" },
      { speaker: "vendor", text: "We could explore radio frequency sensor integrations in an enterprise roadmap review." },
      { speaker: "customer", text: "Understood. The forty-five day target works well for our schedule." },
    ],
    commitments: [
      { lineIndex: 3, quote: "We commit to standard go-live implementation within forty-five days.", type: "timeline", catalogItemId: "tl_golive_standard", dueDays: 45 },
    ],
    decoys: [
      { lineIndex: 1, quote: "Our platform offers instant push notifications to dispatchers on iOS and Android.", kind: "product_description" },
      { lineIndex: 5, quote: "We could explore radio frequency sensor integrations in an enterprise roadmap review.", kind: "discussed" },
    ],
    dependencies: [],
  },
  {
    id: "e18",
    split: "test",
    title: "PowerGen Generators alignment",
    date: "2026-04-18",
    customerCompany: "PowerGen Generators",
    customerName: "Jessica Tan",
    customerRole: "Service Operations",
    lines: [
      { speaker: "customer", text: "We service industrial diesel generators and synchronize client records with HubSpot." },
      { speaker: "vendor", text: "We will have the standard CRM sync connector live within twenty-one days." },
      { speaker: "customer", text: "Our technicians need training on logging generator fuel pressures." },
      { speaker: "vendor", text: "We will provide two admin training sessions completed within seven days." },
      { speaker: "customer", text: "Could the system trigger automatic alerts when generator fuel drops below ten percent?" },
      { speaker: "vendor", text: "I will check if we can add generator fuel level tracking with our telematics team." },
      { speaker: "customer", text: "We will provide our generator model catalog and site locations by Thursday." },
    ],
    commitments: [
      { lineIndex: 1, quote: "We will have the standard CRM sync connector live within twenty-one days.", type: "integration", catalogItemId: "int_crm_sync", dueDays: 21 },
      { lineIndex: 3, quote: "We will provide two admin training sessions completed within seven days.", type: "training", catalogItemId: "trn_admin", dueDays: 7 },
    ],
    decoys: [
      { lineIndex: 5, quote: "I will check if we can add generator fuel level tracking with our telematics team.", kind: "discussed" },
    ],
    dependencies: [
      { lineIndex: 6, quote: "We will provide our generator model catalog and site locations by Thursday." },
    ],
  },
  {
    id: "e19",
    split: "test",
    title: "SafeGuard Security Systems kickoff",
    date: "2026-04-19",
    customerCompany: "SafeGuard Security Systems",
    customerName: "Brian Kelly",
    customerRole: "Security Director",
    lines: [
      { speaker: "customer", text: "Access control keycard installations require single sign-on authentication." },
      { speaker: "vendor", text: "SAML single sign-on will be live within fourteen days of contract signing." },
      { speaker: "customer", text: "We have five distinct escalation workflows for security clearance audits." },
      { speaker: "vendor", text: "We will configure up to ten custom workflows within fourteen days." },
      { speaker: "customer", text: "Can the field app scan legacy magnetic swipe badges directly?" },
      { speaker: "vendor", text: "We could look into integrating with legacy magnetic badges, but that is speculative." },
      { speaker: "customer", text: "That is fine, the mobile barcodes and SSO meet our standard." },
    ],
    commitments: [
      { lineIndex: 1, quote: "SAML single sign-on will be live within fourteen days of contract signing.", type: "integration", catalogItemId: "int_sso", dueDays: 14 },
      { lineIndex: 3, quote: "We will configure up to ten custom workflows within fourteen days.", type: "configuration", catalogItemId: "cfg_workflows", dueDays: 14 },
    ],
    decoys: [
      { lineIndex: 5, quote: "We could look into integrating with legacy magnetic badges, but that is speculative.", kind: "discussed" },
    ],
    dependencies: [],
  },
  {
    id: "e20",
    split: "test",
    title: "Express Fleet Logistics scoping",
    date: "2026-04-20",
    customerCompany: "Express Fleet Logistics",
    customerName: "Monica Ramos",
    customerRole: "Fleet COO",
    lines: [
      { speaker: "customer", text: "We dispatch sixty couriers and have five years of billing records in CSVs." },
      { speaker: "vendor", text: "We can handle the CSV migration within thirty days of contract signature." },
      { speaker: "customer", text: "We need our dispatch fees synced directly to our QuickBooks account." },
      { speaker: "vendor", text: "We will have the accounting sync standard connector live within fourteen days." },
      { speaker: "customer", text: "What is the expected timeline for full cutover to Brightpath?" },
      { speaker: "vendor", text: "We commit to standard go-live implementation within forty-five days." },
      { speaker: "customer", text: "Can we view live delivery heatmaps across metropolitan corridors?" },
      { speaker: "vendor", text: "Let me check if route heatmaps could be added in our upcoming Q3 roadmap." },
      { speaker: "customer", text: "We will export our driver license and vehicle registry by this Friday." },
    ],
    commitments: [
      { lineIndex: 1, quote: "We can handle the CSV migration within thirty days of contract signature.", type: "data_migration", catalogItemId: "mig_csv", dueDays: 30 },
      { lineIndex: 3, quote: "We will have the accounting sync standard connector live within fourteen days.", type: "integration", catalogItemId: "int_accounting", dueDays: 14 },
      { lineIndex: 5, quote: "We commit to standard go-live implementation within forty-five days.", type: "timeline", catalogItemId: "tl_golive_standard", dueDays: 45 },
    ],
    decoys: [
      { lineIndex: 7, quote: "Let me check if route heatmaps could be added in our upcoming Q3 roadmap.", kind: "discussed" },
    ],
    dependencies: [
      { lineIndex: 8, quote: "We will export our driver license and vehicle registry by this Friday." },
    ],
  },
];

const gold: GoldStandard = {};

for (const spec of specs) {
  const speakers = [
    { id: "s1", name: "Priya Raman", role: "Account Executive", company: "Brightpath", side: "vendor" as const },
    { id: "s2", name: spec.customerName, role: spec.customerRole, company: spec.customerCompany, side: "customer" as const },
  ];

  const transcriptLines = spec.lines.map((l, idx) => {
    const lineId = `L${idx + 1}`;
    const minutes = Math.floor((idx * 35) / 60);
    const seconds = (idx * 35) % 60;
    const ts = `00:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    const speakerId = l.speaker === "vendor" ? "s1" : "s2";
    return {
      id: lineId,
      ts,
      speakerId,
      text: l.text,
    };
  });

  const transcript: Transcript = {
    id: spec.id,
    dealId: `d_eval_${spec.id}`,
    title: spec.title,
    date: spec.date,
    source: "call",
    speakers,
    lines: transcriptLines,
  };

  const transcriptPath = path.join(evalTranscriptsDir, `${spec.id}.json`);
  fs.writeFileSync(transcriptPath, JSON.stringify(transcript, null, 2), "utf-8");

  // Compile gold standard
  gold[spec.id] = {
    split: spec.split,
    commitments: spec.commitments.map((c) => ({
      line_id: `L${c.lineIndex + 1}`,
      quote: c.quote,
      type: c.type,
      catalog_item_id: c.catalogItemId,
      due_days: c.dueDays,
    })),
    decoys: spec.decoys.map((d) => ({
      line_id: `L${d.lineIndex + 1}`,
      quote: d.quote,
      kind: d.kind,
    })),
    dependencies: spec.dependencies.map((dep) => ({
      line_id: `L${dep.lineIndex + 1}`,
      quote: dep.quote,
    })),
  };
}

fs.writeFileSync(goldPath, JSON.stringify(gold, null, 2), "utf-8");
console.log(`Generated 20 evaluation transcripts in ${evalTranscriptsDir}`);
console.log(`Generated gold standard with ${Object.keys(gold).length} entries at ${goldPath}`);
