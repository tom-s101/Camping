// Area 2 district/church realignment, transcribed from "MIN2026-24 AREA 2
// DISTRICT AND CHURCH REALIGNMENT" (effective July 1, 2026). Update this file
// if the district/church list changes.
//
// NOTE: two entries were on a page break in the source scan and are best-
// effort reads — please confirm and correct if wrong:
//   - QC-1: "Manresa Company" (3rd church under Associate Christian Sanico)
//   - QC-2: "Kaysakat Mission Group" (5th church under Pastor Ricson Castro)

export type District = {
  code: string;
  pastor: string;
  associatePastor?: string;
  churches: string[];
};

export const DISTRICTS: District[] = [
  {
    code: "QC-1",
    pastor: "Alfred Selin",
    associatePastor: "Christian Sanico",
    churches: ["Sampaloc", "Sta. Mesa Heights", "Damayan-lagi", "Manresa Company"],
  },
  {
    code: "QC-2",
    pastor: "Ricson Castro",
    churches: ["Shekinah", "Tree of Life", "Project-4", "Camp Aguinaldo", "Kaysakat Mission Group"],
  },
  {
    code: "QC-3",
    pastor: "Geryl Paulino",
    churches: ["Quezon Central", "Pag-asa", "Kaingin", "Philcoa Mission"],
  },
  {
    code: "QC-4",
    pastor: "Jemuel Abcede",
    churches: ["Luzon", "Tandang Sora (NPC)", "Pingkian 3 / Sauyo", "Holy Spirit Company", "Sherwood"],
  },
  {
    code: "QC-5",
    pastor: "Joseph Principe",
    churches: ["Bagong Silangan Company", "Feria", "Payatas A", "Promise Land", "NIV"],
  },
  {
    code: "QC-6",
    pastor: "Sammy Jamila",
    churches: ["East Fairview", "North Fairview", "Sta. Lucia", "Aguardiente", "Commonwealth"],
  },
  {
    code: "QC-7",
    pastor: "Sherwin Villarica",
    associatePastor: "Jandell Rivas",
    churches: ["Novaliches", "Sauyo / Bagbag", "Sushila", "North Caloocan", "Rodriguez"],
  },
  {
    code: "QC-8",
    pastor: "Rodney Soledad",
    churches: ["Jordan Heights", "Lagro"],
  },
  {
    code: "QC-9",
    pastor: "Daniel Molleda",
    churches: ["Frisco", "Bago Bantay", "Sitio Militar", "GSIS", "Project 8"],
  },
];

export type SinglePastorate = {
  pastor: string;
  churches: string[];
};

export const SINGLE_PASTORATE_LABEL = "Single Pastorate";

// NOTE: "Glenn Lagabon" / "Daniel Dela Paz" pairing below is a best-effort
// read of an unclear line in the source scan — please confirm.
export const SINGLE_PASTORATES: SinglePastorate[] = [
  { pastor: "Glenn Lagabon", churches: ["Daniel Dela Paz"] },
  { pastor: "Asher Sedeño", churches: ["Manila Center", "Grace Park Mission Group"] },
  { pastor: "Azer Bosito", churches: ["Gao", "Talanay Company"] },
  { pastor: "Anthony Faren", churches: ["UP-Diliman SDAC", "Krus na Ligas Mission Group"] },
];

export function districtLabel(district: District): string {
  return district.associatePastor
    ? `${district.code} — Pastor ${district.pastor} (Assoc. ${district.associatePastor})`
    : `${district.code} — Pastor ${district.pastor}`;
}
