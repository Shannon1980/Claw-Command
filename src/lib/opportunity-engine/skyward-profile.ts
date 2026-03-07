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
  naicsCodes: [], // TBD - retrieve from SAM.gov lookup
};
