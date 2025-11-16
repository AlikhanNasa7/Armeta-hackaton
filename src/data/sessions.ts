export type SessionFile = {
  id: string
  name: string
}

export type Session = {
  id: string
  title: string
  files: SessionFile[]
}

export const mockSessions: Session[] = [
  {
    id: 'session-1',
    title: 'AML Review',
    files: [
      { id: 'file-1', name: 'KYC_Report.pdf' },
      { id: 'file-2', name: 'IdScan.png' },
      { id: 'file-3', name: 'Utility_Bill.pdf' },
    ],
  },
  {
    id: 'session-2',
    title: 'Vendor Onboarding',
    files: [
      { id: 'file-4', name: 'MSA_Draft.pdf' },
      { id: 'file-5', name: 'Insurance.pdf' },
      { id: 'file-6', name: 'Compliance.xlsx' },
      { id: 'file-7', name: 'Tax_Form.pdf' },
    ],
  },
  {
    id: 'session-3',
    title: 'Investor Pack',
    files: [
      { id: 'file-8', name: 'PitchDeck.pdf' },
      { id: 'file-9', name: 'Termsheet.docx' },
    ],
  },
]
