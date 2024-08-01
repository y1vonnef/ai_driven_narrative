const OpenAI = require("openai");
const { createServer } = require("node:http");
const next = require("next");
const { Server } = require("socket.io");

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;
// when using middleware `hostname` and `port` must be provided below
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();
let prompt = ""; // insert prompt representation of what's in your world

// insert your own OpenAI API key (not best practice!)
const openai = new OpenAI({
  apiKey: "",
  dangerouslyAllowBrowser: true,
});

async function fetchGPTResponse() {
  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: "", //insert system prompt, or what the role of the AI is (some sort of manager for the narrative)
      },
      {
        role: "user",
        content: "Return the new world based on the provided:" + prompt,
      }, //change this prompt as most appropriate for your story
    ],
  });
  prompt = response.choices[0].message.content; // this is the updated representation of the world
  console.log(prompt);
}

app.prepare().then(() => {
  const httpServer = createServer(handler);

  const io = new Server(httpServer, {
    allowEIO3: true,
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log(socket.id);

    socket.on("Initial Trigger", (data) => {
      console.log("Received Initial Trigger with data:", data);
      // Process the received data here
      fetchGPTResponse()
        .then((prompt) => {
          io.emit("Prompt Update", prompt);
          console.log("Emitted 'Prompt Update' with: ", prompt);
        })
        .catch((error) => console.log("Error occurred: " + error));
    });
  });

  httpServer
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});
