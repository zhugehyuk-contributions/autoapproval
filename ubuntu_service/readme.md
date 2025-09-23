# etc

## autoapproval

`/etc/systemd/system/autoapproval.service`
```
[Unit]
Description=autoapproval app
After=network.target

[Service]
Environment=NODE_ENV=production
Environment=PORT=3001
WorkingDirectory=/home/localley-dev/localley/autoapproval
ExecStart=/usr/bin/npm start
Restart=always
User=localley-dev

[Install]
WantedBy=multi-user.target
```

```
sudo systemctl daemon-reload
sudo systemctl stop autoapproval; npm run build; sudo systemctl start autoapproval
sudo systemctl status autoapproval
sudo systemctl enable autoapproval
```

```
# see logs
sudo journalctl -u autoapproval.service
# see logs realtime
sudo journalctl -u autoapproval.service -f
```

## pr-labeler

`/etc/systemd/system/pr-labeler.service`
```
[Unit]
Description=pr-labeler app
After=network.target

[Service]
Environment=NODE_ENV=production
Environment=PORT=3002
WorkingDirectory=/home/localley-dev/localley/pr-labeler
ExecStart=/usr/bin/npm start
Restart=always
User=localley-dev

[Install]
WantedBy=multi-user.target
```

```
sudo systemctl daemon-reload
sudo systemctl start pr-labeler
sudo systemctl status pr-labeler
sudo systemctl enable pr-labeler
```


# ref

## autoapproval

To run your Probot Node app as a service on your Ubuntu server, you can create a Systemd service. Systemd is a system and service manager that allows you to manage services on your Linux machine. Here are the steps to create a Systemd service for your Probot app:

1. Create a Systemd unit file for your Probot app by running the following command:
```
sudo nano /etc/systemd/system/probot.service
```
2. In the unit file, add the following configuration:

```
[Unit]
Description=Probot app
After=network.target

[Service]
Environment=NODE_ENV=production
WorkingDirectory=/path/to/your/app
ExecStart=/usr/bin/npm start
Restart=always
User=your_username

[Install]
WantedBy=multi-user.target
```

3. Replace `/path/to/your/app` with the absolute path to your Probot app directory, and replace `your_username` with your Linux username.

4. Save and close the file.

5. Reload the Systemd daemon to load the new service:
```
sudo systemctl daemon-reload
```

6. Start the Probot service:
```
sudo systemctl start probot
```

7. Verify that the service is running:
```
sudo systemctl status probot
```

You should see a message indicating that the service is active and running.

8. Enable the service to start automatically on system boot:
```
sudo systemctl enable probot
```

Your Probot Node app is now running as a service on your Ubuntu server and will start automatically on system boot. You can use the `systemctl` command to start, stop, restart, and check the status of your Probot service.


## pr-labeler

To run two instances of your Probot app on the same server, you will need to create two separate Systemd services, each with its own configuration and environment variables.

Here are the steps to create a second service and change the `PORT` environment variable for the second instance:

1. Create a new Systemd unit file for the second instance of your Probot app by running the following command:
```
sudo nano /etc/systemd/system/probot2.service
```

2. In the new unit file, add the following configuration:
```
[Unit]
Description=Probot app 2
After=network.target

[Service]
Environment=NODE_ENV=production
WorkingDirectory=/path/to/your/second/app
ExecStart=/usr/bin/npm start
Restart=always
User=your_username
Environment=PORT=3001

[Install]
WantedBy=multi-user.target
```
3. Replace `/path/to/your/second/app` with the absolute path to your second Probot app directory, and replace `your_username` with your Linux username. Also, note that the `Environment` directive for the `PORT` variable has been set to 3001 in this example.

4. Save and close the file.

5. Reload the Systemd daemon to load the new service:
```
sudo systemctl daemon-reload
```

6. Start the second Probot service:
```
sudo systemctl start probot2
```

7. Verify that the service is running:
```
sudo systemctl status probot2
```

You should see a message indicating that the second service is active and running.

8. Enable the second service to start automatically on system boot:
```
sudo systemctl enable probot2
```

Your two Probot Node apps are now running as separate services on your Ubuntu server, with different environment variables and configuration. You can use the `systemctl` command to start, stop, restart, and check the status of each service.
