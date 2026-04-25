import {
  db,
  projectsTable,
  resourcesTable,
  demandsTable,
  allocationsTable,
  budgetsTable,
  actualsTable,
  pool,
} from "@workspace/db";

async function main() {
  // Clean
  await db.delete(actualsTable);
  await db.delete(budgetsTable);
  await db.delete(allocationsTable);
  await db.delete(demandsTable);
  await db.delete(projectsTable);
  await db.delete(resourcesTable);

  const projects = await db
    .insert(projectsTable)
    .values([
      {
        name: "Core Banking Platform Modernization",
        code: "CB-2026-001",
        portfolio: "Digital Banking",
        startDate: "2026-01-01",
        endDate: "2027-12-31",
        phase: "Capex",
        budgetOwner: "A. Rahman",
        status: "Active",
        approvedBudget: "4250000.00",
      },
      {
        name: "Customer 360 Data Lake",
        code: "DL-2026-014",
        portfolio: "Data & Analytics",
        startDate: "2026-02-15",
        endDate: "2026-12-15",
        phase: "Capex",
        budgetOwner: "M. Chen",
        status: "Active",
        approvedBudget: "1800000.00",
      },
      {
        name: "Branch Network Run & Maintain",
        code: "OP-2026-022",
        portfolio: "Infrastructure",
        startDate: "2026-01-01",
        endDate: "2026-12-31",
        phase: "Run",
        budgetOwner: "S. Patel",
        status: "Active",
        approvedBudget: "920000.00",
      },
      {
        name: "Regulatory Reporting (Basel IV)",
        code: "RG-2026-008",
        portfolio: "Risk & Compliance",
        startDate: "2026-03-01",
        endDate: "2027-06-30",
        phase: "Change",
        budgetOwner: "L. Novak",
        status: "Planned",
        approvedBudget: "2100000.00",
      },
      {
        name: "Mobile App v6 Refresh",
        code: "MB-2026-031",
        portfolio: "Digital Banking",
        startDate: "2026-04-01",
        endDate: "2026-11-30",
        phase: "Opex",
        budgetOwner: "A. Rahman",
        status: "Active",
        approvedBudget: "640000.00",
      },
      {
        name: "AI Fraud Detection Pilot",
        code: "AI-2026-002",
        portfolio: "Risk & Compliance",
        startDate: "2026-05-01",
        endDate: "2026-12-31",
        phase: "Capex",
        budgetOwner: "L. Novak",
        status: "Active",
        approvedBudget: "1100000.00",
      },
      {
        name: "Cloud Migration Wave 3",
        code: "CL-2025-019",
        portfolio: "Infrastructure",
        startDate: "2025-06-01",
        endDate: "2026-09-30",
        phase: "Capex",
        budgetOwner: "S. Patel",
        status: "Active",
        approvedBudget: "3400000.00",
      },
    ])
    .returning();

  const resources = await db
    .insert(resourcesTable)
    .values([
      { name: "Priya Nair", role: "Solution Architect", primarySkill: "Java", secondarySkills: ["AWS", "Kafka"], location: "Bengaluru", rate: "850.00", rateType: "daily", employmentType: "FTE", availabilityPct: "100", costCentre: "CC-1001" },
      { name: "Diego Alvarez", role: "Senior Engineer", primarySkill: "React", secondarySkills: ["TypeScript", "GraphQL"], location: "Madrid", rate: "720.00", rateType: "daily", employmentType: "FTE", availabilityPct: "100", costCentre: "CC-1001" },
      { name: "Yuki Tanaka", role: "Data Engineer", primarySkill: "Python", secondarySkills: ["Spark", "Snowflake"], location: "Tokyo", rate: "780.00", rateType: "daily", employmentType: "FTE", availabilityPct: "100", costCentre: "CC-1004" },
      { name: "Hassan Karim", role: "DevOps Engineer", primarySkill: "Kubernetes", secondarySkills: ["Terraform", "AWS"], location: "Dubai", rate: "690.00", rateType: "daily", employmentType: "Contractor", availabilityPct: "80", costCentre: "CC-1002" },
      { name: "Amelia Brooks", role: "Product Manager", primarySkill: "Product", secondarySkills: ["Agile", "Discovery"], location: "London", rate: "950.00", rateType: "daily", employmentType: "FTE", availabilityPct: "100", costCentre: "CC-1001" },
      { name: "Lucas Müller", role: "QA Lead", primarySkill: "Test Automation", secondarySkills: ["Cypress", "JMeter"], location: "Berlin", rate: "640.00", rateType: "daily", employmentType: "FTE", availabilityPct: "100", costCentre: "CC-1003" },
      { name: "Aanya Kapoor", role: "ML Engineer", primarySkill: "Python", secondarySkills: ["TensorFlow", "MLOps"], location: "Bengaluru", rate: "820.00", rateType: "daily", employmentType: "FTE", availabilityPct: "100", costCentre: "CC-1004" },
      { name: "Marco Bianchi", role: "Security Engineer", primarySkill: "Security", secondarySkills: ["IAM", "PenTest"], location: "Milan", rate: "780.00", rateType: "daily", employmentType: "FTE", availabilityPct: "100", costCentre: "CC-1005" },
      { name: "Niamh O'Connor", role: "Business Analyst", primarySkill: "BA", secondarySkills: ["BPMN", "Compliance"], location: "Dublin", rate: "590.00", rateType: "daily", employmentType: "FTE", availabilityPct: "100", costCentre: "CC-1003" },
      { name: "Vendor: NorthStack", role: "Engineering Pod", primarySkill: "Java", secondarySkills: ["Spring", "Postgres"], location: "Krakow", rate: "1450.00", rateType: "daily", employmentType: "Vendor", availabilityPct: "100", costCentre: "CC-1010" },
      { name: "Vendor: Lumen Cloud", role: "Cloud Specialists", primarySkill: "AWS", secondarySkills: ["Networking"], location: "Singapore", rate: "1620.00", rateType: "daily", employmentType: "Vendor", availabilityPct: "100", costCentre: "CC-1010" },
      { name: "Sam Reilly", role: "Frontend Engineer", primarySkill: "React", secondarySkills: ["Next.js"], location: "Toronto", rate: "660.00", rateType: "daily", employmentType: "FTE", availabilityPct: "100", costCentre: "CC-1001" },
    ])
    .returning();

  const projById = Object.fromEntries(projects.map((p) => [p.code, p.id]));
  const resByName = Object.fromEntries(resources.map((r) => [r.name, r.id]));

  await db.insert(demandsTable).values([
    { projectId: projById["CB-2026-001"]!, skillRequired: "Java", roleRequired: "Senior Engineer", startMonth: "2026-05", endMonth: "2026-12", requiredFte: "3", priority: "High", status: "Approved" },
    { projectId: projById["CB-2026-001"]!, skillRequired: "Kubernetes", roleRequired: "DevOps Engineer", startMonth: "2026-05", endMonth: "2026-10", requiredFte: "2", priority: "High", status: "Submitted" },
    { projectId: projById["DL-2026-014"]!, skillRequired: "Python", roleRequired: "Data Engineer", startMonth: "2026-04", endMonth: "2026-11", requiredFte: "2", priority: "Critical", status: "Approved" },
    { projectId: projById["DL-2026-014"]!, skillRequired: "Python", roleRequired: "ML Engineer", startMonth: "2026-06", endMonth: "2026-10", requiredFte: "1", priority: "Medium", status: "Submitted" },
    { projectId: projById["RG-2026-008"]!, skillRequired: "BA", roleRequired: "Business Analyst", startMonth: "2026-05", endMonth: "2027-03", requiredFte: "2", priority: "High", status: "Submitted" },
    { projectId: projById["MB-2026-031"]!, skillRequired: "React", roleRequired: "Frontend Engineer", startMonth: "2026-05", endMonth: "2026-11", requiredFte: "2", priority: "Medium", status: "Approved" },
    { projectId: projById["AI-2026-002"]!, skillRequired: "Python", roleRequired: "ML Engineer", startMonth: "2026-06", endMonth: "2026-12", requiredFte: "2", priority: "Critical", status: "Submitted" },
    { projectId: projById["CL-2025-019"]!, skillRequired: "AWS", roleRequired: "Cloud Specialist", startMonth: "2026-01", endMonth: "2026-09", requiredFte: "3", priority: "High", status: "Fulfilled" },
    { projectId: projById["RG-2026-008"]!, skillRequired: "Security", roleRequired: "Security Engineer", startMonth: "2026-04", endMonth: "2026-12", requiredFte: "1", priority: "High", status: "Draft" },
    { projectId: projById["CB-2026-001"]!, skillRequired: "Test Automation", roleRequired: "QA Lead", startMonth: "2026-07", endMonth: "2026-12", requiredFte: "1", priority: "Medium", status: "Approved" },
  ]);

  // Allocations across Apr–Aug 2026
  const allocations: typeof allocationsTable.$inferInsert[] = [];
  const months = [4, 5, 6, 7, 8];
  function alloc(projCode: string, resName: string, month: number, days: number, pct: number, opex: number, capex: number, wbs: string) {
    const r = resources.find((x) => x.name === resName)!;
    allocations.push({
      projectId: projById[projCode]!,
      resourceId: resByName[resName]!,
      month,
      year: 2026,
      plannedDays: String(days),
      allocationPct: String(pct),
      rate: r.rate,
      opexPct: String(opex),
      capexPct: String(capex),
      wbsCode: wbs,
    });
  }

  for (const m of months) {
    alloc("CB-2026-001", "Priya Nair", m, 18, 80, 0, 100, "WBS-CB-ARC");
    alloc("CB-2026-001", "Diego Alvarez", m, 20, 100, 0, 100, "WBS-CB-ENG");
    alloc("CB-2026-001", "Vendor: NorthStack", m, 20, 100, 0, 100, "WBS-CB-VND");
    alloc("DL-2026-014", "Yuki Tanaka", m, 18, 90, 0, 100, "WBS-DL-DAT");
    alloc("DL-2026-014", "Aanya Kapoor", m, 12, 60, 0, 100, "WBS-DL-ML");
    alloc("MB-2026-031", "Sam Reilly", m, 18, 90, 100, 0, "WBS-MB-FE");
    alloc("MB-2026-031", "Diego Alvarez", m, 4, 20, 100, 0, "WBS-MB-FE");
    alloc("AI-2026-002", "Aanya Kapoor", m, 8, 40, 0, 100, "WBS-AI-ML");
    alloc("CL-2025-019", "Hassan Karim", m, 16, 80, 0, 100, "WBS-CL-OPS");
    alloc("CL-2025-019", "Vendor: Lumen Cloud", m, 18, 90, 0, 100, "WBS-CL-VND");
    alloc("OP-2026-022", "Lucas Müller", m, 8, 40, 100, 0, "WBS-OP-QA");
    alloc("RG-2026-008", "Niamh O'Connor", m >= 5 ? m : 5, 16, 80, 100, 0, "WBS-RG-BA");
    alloc("RG-2026-008", "Marco Bianchi", m >= 5 ? m : 5, 12, 60, 100, 0, "WBS-RG-SEC");
    alloc("CB-2026-001", "Amelia Brooks", m, 10, 50, 0, 100, "WBS-CB-PM");
  }
  await db.insert(allocationsTable).values(allocations);

  // Budgets across all 12 months 2026 + key 2025/2027 entries
  const budgets: typeof budgetsTable.$inferInsert[] = [];
  function budget(projCode: string, year: number, month: number, costType: string, approved: number, forecast: number, plannedRes: number, nonRes: number) {
    budgets.push({
      projectId: projById[projCode]!,
      year,
      month,
      costType,
      approvedBudget: String(approved),
      forecastBudget: String(forecast),
      plannedResourceCost: String(plannedRes),
      nonResourceCost: String(nonRes),
    });
  }
  for (let m = 1; m <= 12; m++) {
    budget("CB-2026-001", 2026, m, "Capex", 180000, 175000, 140000, 30000);
    budget("DL-2026-014", 2026, m, "Capex", 120000, 130000, 95000, 20000);
    budget("OP-2026-022", 2026, m, "Opex", 75000, 78000, 50000, 25000);
    budget("MB-2026-031", 2026, m, "Opex", 55000, 60000, 42000, 10000);
    budget("AI-2026-002", 2026, m, "Capex", 90000, 95000, 70000, 15000);
    budget("CL-2025-019", 2026, m, "Capex", 160000, 170000, 120000, 30000);
  }
  for (let m = 3; m <= 12; m++) {
    budget("RG-2026-008", 2026, m, "Capex", 130000, 135000, 100000, 25000);
  }
  for (let m = 6; m <= 12; m++) {
    budget("CL-2025-019", 2025, m, "Capex", 140000, 145000, 110000, 25000);
  }
  for (let m = 1; m <= 12; m++) {
    budget("CB-2026-001", 2027, m, "Capex", 175000, 178000, 138000, 30000);
    budget("RG-2026-008", 2027, m, "Capex", 135000, 138000, 102000, 25000);
  }
  await db.insert(budgetsTable).values(budgets);

  // Actuals Jan–Apr 2026 (year-to-date)
  const actuals: typeof actualsTable.$inferInsert[] = [];
  function actual(projCode: string, year: number, month: number, res: number, vendor: number, invoice: number, source: string) {
    actuals.push({
      projectId: projById[projCode]!,
      year,
      month,
      actualResourceCost: String(res),
      actualVendorCost: String(vendor),
      actualInvoiceCost: String(invoice),
      source,
    });
  }
  for (let m = 1; m <= 4; m++) {
    actual("CB-2026-001", 2026, m, 95000, 38000, 12000, "ExcelUpload");
    actual("DL-2026-014", 2026, m, 78000, 14000, 8000, "Manual");
    actual("OP-2026-022", 2026, m, 42000, 6000, 18000, "ExcelUpload");
    actual("MB-2026-031", 2026, m, 30000, 0, 6000, "Timesheet");
    actual("CL-2025-019", 2026, m, 80000, 65000, 10000, "SAP");
  }
  actual("AI-2026-002", 2026, 4, 24000, 0, 5000, "Manual");
  for (let m = 6; m <= 12; m++) {
    actual("CL-2025-019", 2025, m, 78000, 60000, 9000, "SAP");
  }
  await db.insert(actualsTable).values(actuals);

  console.log("Seed complete:", {
    projects: projects.length,
    resources: resources.length,
  });
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
