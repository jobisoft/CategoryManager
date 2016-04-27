# Install Instructions

There are 3 options to install the Category Manager:
* Get the official package from Mozilla
* Build your own package from the source
* Link the source directly to your Thundebird profile


## Get the official version from Mozilla

Start Thunderbird and go to the Add-On page and enter "CategoryManager" into the search field at the top right corner. It should display an entry for the Category Manager which provides an "install" buton.


## Build your own package from the source

First clone this repository (you need git for this to work)

`git clone https://github.com/jobisoft/CategoryManager.git`

or download it from here: https://github.com/jobisoft/CategoryManager/archive/master.zip.

Everything inside the "sendtocategory" folder needs to be packed into a zip file, which needs to be renamed to *.xpi. Start Thunderbird and go to the Add-On page, click on the settings rotary and select "install from file" and select your xpi file.


## Link the source directly to your Thunderbird profile

This option is helpful, if you want to make changes to the Category Manager. First remove any installed version of the Category Manager. Clone the repository and create a file called

`sendtocategory@jobisoft.de`

which contains only one line, containing the path to the "sendtocategory" folder of the source, i.e. 

`C:\Users\John\Documents\GitHub\CategoryManager\sendtocategory\`

Restart Thunderbird, it will prompt a security warning about the installation. If you change the source, Thunderbird needs to be restarted, to catch the changes.
