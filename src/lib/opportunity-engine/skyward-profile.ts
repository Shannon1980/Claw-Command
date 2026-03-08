import type { SkywardPartnerProfile } from "./types";

export const SKYWARD_PROFILE: SkywardPartnerProfile = {
  name: "Skyward IT Solutions",
  certifications: {
    sba8a: { certified: true, expiresDate: "2027-05-31" },
    mbeSbeDb: true,
    gsaMas: "47QTCA19D00AB",
    gsa8aStarsIII: "47QTCB21D0160",
    gsaOasisPlus: "47QRCA25DS993",
    faaEfast: "693KA9-22-A-00182",
    cmmiLevel3: true,
    iso9001: true,
    iso27001: true,
  },
  ids: {
    uei: "JHH5NXX58DM4",
    cageCode: "745E7",
    duns: "060084260",
  },
  naicsCodes: [
    "541511", // Custom Computer Programming Services
    "541512", // Computer Systems Design Services
    "541513", // Computer Facilities Management Services
    "541519", // Other Computer Related Services
    "541611", // Administrative Management Consulting
    "541614", // Process, Physical Distribution, and Logistics Consulting
    "541618", // Other Management Consulting
    "541690", // Other Scientific and Technical Consulting
    "541715", // R&D in Physical, Engineering, and Life Sciences
    "518210", // Data Processing, Hosting, and Related Services
    "541330", // Engineering Services (FAA eFAST)
    "541380", // Testing Laboratories and Services
    "561210", // Facilities Support Services
    "611420", // Computer Training
    "611430", // Professional and Management Development Training
  ],
};
