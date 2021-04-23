# Welcome to the TREESAP Desktop Application!

# Setup

If your organization is using the TREESAP app for the first time, and you have not been given a version of the TREESAP installer with a Google Maps API key, you will need to obtain an API key, make a minor edit to the app’s source code, and recompile and re-run the TREESAP installer before using the TREESAP app. The following sections contain steps for accomplishing this. 

Note: Node.js is required for the setup steps summarized above. Instructions for installing Node.js to your computer can be found [here](https://treehouse.github.io/installation-guides/windows/node-windows.html).

If you have a version of the TREESAP installer with your organization’s API key included, then you do not need to worry about the above setup steps, and you can skip to "Running the TREESAP Installer". Node.js is not required to run the TREESAP installer and use the TREESAP app.

## Downloading the App Source Code
There are two ways to download the app’s source code:
 
1. If you have git installed on your machine, you can clone the TREESAP repository opening a command shell in a directory of your choosing, and running:
	
	`git clone https://github.com/Capstone-TREESAP/TREESAP.git`

    After the repository is done unpacking, run:
	
	`cd TREESAP/desktop_application`

    This folder contains the source code for the TREESAP app. 

2. If you do not have git installed, you can install it by following [these steps](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git), or you can download a .zip file of the TREESAP repository by visiting the repo’s [webpage](https://github.com/Capstone-TREESAP/TREESAP) and clicking Code → Download ZIP.

    Extract the .zip file’s contents to a directory of your choice, and once it has extracted, open a command shell inside that directory (default name will be TREESAP-main). 

    Run the following:

	`cd TREESAP-main/desktop_application`

	This folder contains the source code for the TREESAP app.

## Obtaining a Google Maps API Key
A Google Maps JavaScript API key is needed to support the interactive map interface in the TREESAP app. If this is your first time running the TREESAP App, you will need to obtain an API key and make a small change to the app’s source code to add your key. 

Instructions for obtaining a Google Maps JavaScript API key can be found [here](https://developers.google.com/maps/documentation/javascript/get-api-key).
Once you have obtained an API key, follow these steps to add it to the app’s source code (**Node.js installation required**):

1. Inside the TREESAP repository you downloaded in the previous section, open the file at the path desktop_application/src/App.js for editing. 

2. In App.js locate this line:

	`const GOOGLE_MAPS_API_KEY = ‘<YOUR API KEY HERE>’`

    It should be just below the imports at the top of the file.

3. Replace `<YOUR API KEY HERE>` with your API key. 

4. Save your changes to the file. 

## Building the TREESAP Installer 

**(Note: Node.js is required to build the installer)**

After making changes to the app’s source code, you will need to build the TREESAP installer. 

First, to install all app dependencies, open a command shell inside the desktop_application folder inside your copy of the repository, and run:
	
`npm install`

Once all dependencies are done installing, run the following to build the installer:

`npm run electron-pack`

Once the installer is finished building, it will be located inside the desktop_application/dist folder, and it will be named something like “treesap Setup 1.0.0”.

## Running the TREESAP Installer 

**(Note: Node.js is NOT required to run the installer)**

Double-click the “treesap Setup x.x.x” installer file to run it. In a few seconds, the TREESAP app should open to the landing page.

The “treesap Setup x.x.x” file you have created can now be distributed to anyone in your organization, to install and run the TREESAP app on their own machine, without downloading the app source code, or going through any of the above setup steps.

By default, the installer will install the TREESAP app to this location (on Windows):

`C:\Users\<YOUR WINDOWS USERNAME>\AppData\Local\Programs\treesap\treesap.exe`

For easier access to the app, locate the treesap folder in Windows File Explorer, and move or copy this folder to a convenient location in your system. Additionally, you may want to create a shortcut to treesap.exe, and move or pin this shortcut to an easily-accessible location on your machine. 

# Running in Development Mode

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).
