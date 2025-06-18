# TanTan Chat
Ergonomic Chat for Humans

TanTan Chat is a modern, ergonomic AI chat application designed to enhance user experience and productivity. It offers a clean and intuitive interface, ensuring that users can focus on their conversations without distractions.

![Screenshot](screenshot.png)
*Note: No Humans used in the backend*<sup>\*</sup>

# Use
Visit a live instance here:
https://tantan.konkon.pablonara.com/

# Features
## File Uploads
![File Uploads](showcase_fileuploads.mov)

# Setup with Docker Compose
```sh
git clone https://github.com/t35-turbo/TanTanChat.git
cd TanTanChat
mv .env.example .env
# Optional: Set some secure random passwords!!!! as well as the port in .env
docker compose up --build -d
# Visit port 3111
```
\*: *Backend may contain trace quantities of interns*