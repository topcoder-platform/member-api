## Rollback flow
```
ES -> DB -> success -> publish message -> return 200
ES -> fail -> rollback manually from ES -> publish to error message -> return 500
ES -> DB -> fail -> rollback manually from ES and DB both -> publish to error message -> return 500
```

## Postman verification example
* set up environmen
```bash
npm run init-db && npm run init-es force && npm run seed-data
npm start
```

### example1: update member email
* endpoint: verify email > `update member - change email address for upbeat`  
steps:
1. verify data in es and db
```
npm run view-es-data Member
npm run view-db-data profile
```

2. In src/services/MemberService.js updateMember function, insert a line before `catch` syntax:
```js
throw 'error'  
```
3. Send api request

4. verify data in es and db  
**The emailVerifyToken and newEmailVerifyToken field data should keep unchanged, because the transaction rollback function has been executed**  
Notes: the original es processor will upsert by userId instead of update existing data, I kept this feature

5. delete above line 
```js
throw 'error'  
```

6. verify data in es and db
The `emailVerifyToken` field should be changed

### example2: verify email
* endpoint: verify email > verify email - upbeat - admin token  

use changed value of `emailVerifyToken` field to set token of query, then send request to verify different cases.

## **Take similar steps for other service**:
* endpoint: update member > `update member - upbeat`
* endpoint: upload photo > `upload photo`
* endpoint: create member traits > `create member traits`
* endpoint: update member traits > `update member traits`
* endpoint: remove member traits > `remove member traits - software`