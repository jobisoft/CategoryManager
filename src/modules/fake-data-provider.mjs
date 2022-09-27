export default function data() {
  return [
    {
      name: "Personal Address Book",
      readOnly: false,
      contacts: [
        {
          readOnly: false,
          properties: {
            LastName: "A",
            FirstName: "B",
            DisplayName: "B A",
            PrimaryEmail: "google@example.com",
            Categories: "AAA",
          },
        },
        {
          readOnly: false,
          properties: {
            LastName: "C",
            FirstName: "D",
            DisplayName: "D C",
            PrimaryEmail: "hello@example.com",
            Categories: "AAA/BB",
          },
        },
        {
          readOnly: false,
          properties: {
            LastName: "E",
            FirstName: "F",
            DisplayName: "F E",
            PrimaryEmail: "abc@example.com",
            Categories: "AAA/BB",
          },
        },
        {
          readOnly: false,
          properties: {
            LastName: "K",
            FirstName: "AB",
            DisplayName: "AB K",
            PrimaryEmail: "fake@example.com",
            Categories: "TEST",
          },
        },
        {
          readOnly: false,
          properties: {
            LastName: "Uasd",
            FirstName: "Nasd",
            DisplayName: "Nasd Uasd",
            PrimaryEmail: "test@example.com",
            Categories: "TEST",
          },
        },
      ],
    },
  ];
}
