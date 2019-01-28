//--V1.1.0.0
// 1-done/tested. long names wrap instead of overlapping
// 2-done/tested .. leave as is but caption with <empty> blank titles - what happens
// 3-done/tested. ascendingdescending text reversed 
// 4-done/tested more space available for the mac. 
// 5-done/tested. selected area not working
// 6-done/tested seems to work, normal to not generate dicers... generate stays on the generate page even if switched, and then doesnt generate dicer when data entered
// 7-done/tested Process.selectFields is undefined
// 8-done/tested. firefox fails because of a property name of .watch see...
// https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Object/watch
//--V2.0.0.0-------
// 9-done no scrolling for 'about' tab & also funny scrollbar behaviors in dicer tab
// 10-done when you delete a dicer then go back, it reappears .. some complex interaction between showing/queue that i cant figure out.
// 11 - need to save the disposition (settings, positions?) of dicers in a save operation
// 12-done multiple columns with same name, generate unique key
// 13-done detect tables when more on a page
// 14-done reminder to save selections when activating pro plan
// 15-done change gold & premium to pro
// 16-done reduce the data polling time - its not reacting quickly enough
// 17-notdoing - introduce option? for whether dicers remain the same when changing sheets and they have the same titles
// 18-done coupon code for free pro time
// 19-notdoing use cloud storage rather than properties ? 
// 20-done add properties to set up the tableblock detection
// 21-done add table block detection to the pro settings
// 22 - move from using server props to user props and document props
// 23-done update elementer to figure out its own reset button
// 24-done initial spinner stopped working
// 25-done error messages offset in upgrade screen
// 26 - update whats available in premium version
// 27-done color filtering
// 28-done change properties save button to apply
// 29-done make cleaning process if active only
// 30 - remember to set proper max prop size in use user props
// 31 - write a web app that can generate tokens
// 32-done plan enabled status not saved with settings
// 33-done move coupon stuff to its own namespace
// 34 - expiration reminder
// 35-done see what happens with blank columns and selected data - no data is detected for range.. works ok for whole sheet
// 36-done need to handle selected range status when flipping between sheets.
// 37-done add divider between pro plan enabled and its settings
// 38-done give dicerarea a little more space
// 39-done can i make overflowing dicers come back in again? - added staggerwrap option
// 40-done getting typerror plan of undefined when starting clean up store
// 41-done added allowscroll to pro plan, and to interactor init. reacting to change is just bollox
// 42-done pro plan settings not being saved
// 43-done move scrolling to regular plan
// 44-done can we automate the reset button on change event
// 45-cantreproduce - maybe a one off, but i got signed off...
// 46-done if no scrolling, its not set properly on start up
// 47-not doing-can still resize beyond right and bottom, regardless of scroll settings, but I'll leave it like that
// 48 - when subscribing, then automatically enable  pro ? in settings
// 49-done there's an issue when adding new params to saved params.. they dont get set up. Always need to merge the standard with the saved.
// 50-done when headings change, (for example enabling autofind) plot automatic dicers again? - gtting this also The coordinates or dimensions of the range are invalid.(?)
// 51-done- make columns a/b etc. if blank - this can happen in fiddler.
// 52-not doing-?allow no headings?
// 53 - theres going to maybe be an unresolvable issue about saved dicers when there used to be duplicate or blank columns headings.. document this
// 54-cant reproduce plots in funny positions when new dicers are added with a fake change of page - actually i cant reproduce this.
// 55-done tidy up settings text to try to fit on one line
// 56-done selected range + autofind is messed up
// 57-done selected range + bclank column headers is messed up
// 58-done selecting color icon doesnt provoke a data refresh
// 59-done any data change screws up the selections
// 60 - add paypal option
// 61-done add specific range option
// 62-done rearrange pro options to where they should appear
// 63-done put dicer appearance settings on its own page
// 64-done remove property caused assert failure when i added an empty row - add an ignore 'n' blank lines to the table detect
// 65-done need to restart polling on error
// 66-done there's a problem with auto detecting tables being treated as a change in sheet ..when blank lines are inserted.. perhaps would work with save enabled
// 67-done default values for specific range option
// 68-done - this was a non-issue document properties not being cleared in save dialog
// 69-done sort using values
// 70-done- take a good look at the effect of block changing - a change in dimension looks like a new sheet - cant reproduce.
// 71 - not doing this version filters
// 72-done- combine dicers with and.or logic
// 73-done use position 1 with table select and only headings, we get not a valid name
// 74-done might be related to 73 - trying to filter with blank rows in the data - get invalid column name dicedata
// 75-done - it works fine, false alarm -  filtering doesnt work on autofound tables
// 76-done - it wasnt, false alarm -  sort icon is round the wrong way
// 77-done delete an icon with the add button .. it doesnt go away
// 78-done add with add button and the OR icon isnt there - its also not there when settings are on at initialization
// 79 - not doing - changing colors doesnt happen immediately - this is an edge case, doesnt really matter
// 80-done add NOT dicers 
// 82 - not doing - customize meaning of matching - this would be little used
// 83-done- sort doesnt work any more - typo in property name
// 84-done- marker style for OR not working any more
// 85-done- autofind tables not working any more when not saved - it doesnt find the correct titles .. this was tolerate blank rows leading rows
// 86-done- sometimes it just stops, and then complains about headings being wrong  .. this was the queue not being cleared out
// 87-done- removing dicers from the add panel sometimes doesnt work .. checked property was missing
// 88-done- now that we have topleft, clean out dicers needs some work .. renamed properties
// 89-done- added pause button
// 90-done allow non pro version to manipulate expiry reminders
// 91-done- dontthink this was an issue -  pro version wouldnt work with sepecific range ??
// 92-done- multiple settings for save sheets with color not being propertly remembered. needed to clone queue in cache
// 93 - a bit of a performance with saving for the document, something fishy but i dont know what
// 94 - need to check that save for use in all documents still works
// 95 - save sheet by user - could just be a case of writing to uer properties rather than document.
// 96 - defect .. stagger settings not saved when apply is used