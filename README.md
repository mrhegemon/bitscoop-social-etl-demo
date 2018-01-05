## BitScoop Integration of Social data sources

This application is made up of three major components: the Front-End, the Generator, and the Worker.

### Front-end

The front-end is a web app served up from and run off of a Lambda function, with the routing handled by API Gateway.
It uses BitScoop for social login via Google and for creating Connections to the various services.

#### Social login with BitScoop
Any social login service can be implemented by following the example of Google here.
The API Map for Google sign-in is relatively simple, with just an 'auth' block to configure how to perform OAuth authorization and a 'meta' block that is automatically called to retrieve user information.

##### Create Connection and Association Session
When a user goes to sign up or log in, a new Connection is created off of the Google Sign-In map.
As part of the Connection creation process, a custom 'redirect_url' is passed in the request body pointing to the 'complete-login' route with a query parameter 'type' indicating whether this is a login or signup.
The result of this call is an object with the new Connection's ID and a separate 'redirectUrl' that is on Google's domain.
The app then creates a temporary 'assocation session' in SQL that contains a session token and the ID of the Connection.
The session token is stored on a short-lived cookie for the app's domain.
Finally, the user is redirected to the second 'redirectUrl' that will begin the authorization process on Google's domain. 

##### Authorize User and check Uniqueness
Once the user has been redirected to Google's OAuth workflow, they are asked to sign in to an account/pick which account they want to use, and then asked to confirm the permissions being requested.
BitScoop handles all of the OAuth negotiation under-the-hood, with no need to have any endpoints on your end.
When the process is complete, BitScoop gets returned the access token and refresh token for Google, and saves these to the Connection.
It then automatically calls the 'meta' endpoint and saves any data returned on the 'meta' field on the Connection.
In the case of Google Sign-In, that's the ID of the user's Google account, their names, and their emails.

This map's meta block is set up with a 'uniqueness_location', which checks to see if any other Connections for that Map have an identical value for the specified field.
If there is one, then the new Connection being authorized is destroyed and the existing Connection ID will be passed back in addition to the ID of the now-destroyed Connection.
This feature ensures that only one Connection can exist for a specific account. 

##### Finish login/sign-up and create Session
The user is then redirected to the 'redirect_url' that was passed in as part of the Connection creation process, which in this case is the 'complete-login' route.
The Connection ID is passed back as a query parameter, along with an Existing Connection ID if there was already a Connection to that account.
The view authenticates that the authorization process succeeded for that user by looking up an Association Session with the Connection ID and the Association Session token stored on the cookie that was created earlier.
If either of these values doesn't match, then the whole process is aborted.
If they both match, then the app is assured that the authorization process for that Connection was done by that user.

The Association Session is deleted since it's no longer needed, and the proper Connection is fetched (either from connection_id or existing_connection_id if the one that was just made was a duplicate for that account).
In the case of a signup, then the app searches for users where 'accountConnectionId' is that ID.
If there is at least one, then that account is already in use for a user and what gets returned is an error message telling the user to sign in with that account instead.
If there aren't any, then a new User is created where 'accountConnectionId' is that Connection ID.
In the case of a login, then the app just fetches the user whose 'accountConnectionId' is that Connection ID.

The final step is creating a Session for that user and setting a cookie with the session token.
Most of the other routes are authenticated by reading this session token and retrieving the user from that token.

#### Creating Data Connections with BitScoop
Connections to data services are handled in much the same way as the Social Login connections.
The buttons on the app link to the '/connections' endpoint, which creates a Connection to the service specified in a query parameter.
This Connection ID is saved on the user and then the user is redirected to authorize the Connection.

After authorization, they are redirected back to '/complete-service'.
If no Connection existed for that account, then nothing more needs to be done other than sending the user back to the home page.
If there was an existing Connection, then the Connection ID for that user is updated to be the 'existing_connection_id'.

### Generator
The Generator is a Lambda function that can be scheduled to run at a given interval.
It retrieves all of the users in the database and iterates over each one.
It checks if each user has a Connection to each service, and if so kicks off an instance of the Worker for that Connection by passing the Connection ID, service name, and User ID.
This allows the Worker task to be parallelized as much as needed so that no call to a service for a given Connection interferes with any other.
If any of these calls fail, that failure has no bearing on any of the other calls.

### Worker
The Worker is a Lambda function that is triggered by the Generator for each Connection that needs to be run.
It gets passed a Connection ID, service name, and User ID.
It has a list of Sources for each service that should be called; each Source maps to an Endpoint in that service's Map, but not all Endpoints have a Source.
This is because some Endpoints exist only to be called by another Endpoint, not on their own.

For example, Google has a source 'GmailInbox', which calls the Endpoint of the same name.
What's returned from this endpoint is ordinarily just a list of IDs, without any email content.
To get this information, you have to call a separate endpoint, 'GmailMessage', using a message ID.
BitScoop's modeling lets you automatically hydrate each result from 'GmailInbox' with the 'GmailMessage' data without waiting for the 'GmailInbox' call to return to you.
'GmailMessage' doesn't have a Source since it's only there to be called by 'GmailInbox'. 

The Worker calls each Endpoint that has a Source, with headers 'X-Connection-Id: <userId>' and 'X-Populate: *'.
'X-Populate' tells BitScoop to hydrate all related fields in its model, such as 'GmailMessage' described above.
If there aren't any related fields, nothing extra happens.
When the fully hydrated data is returned, it's put into an S3 bucket 'brix-bitscoop-data'.
The structure is <userId>/<service>/<endpointName>/<YYYY-MM-DD>; this can be altered to whatever makes the most sense for your needs.

This process needs improvement to handle pagination; what's currently there only retrieves a single page of data.
Pagination can be a tricky process to manage since many APIs have different methods of paginating.
BitScoop does not currently offer any features for automatic pagination.
Implementing pagination would likely require separate, custom code for each service.
