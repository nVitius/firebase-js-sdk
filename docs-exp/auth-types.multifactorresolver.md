<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@firebase/auth-types](./auth-types.md) &gt; [MultiFactorResolver](./auth-types.multifactorresolver.md)

## MultiFactorResolver class

The class used to facilitate recovery from [MultiFactorError](./auth-types.multifactorerror.md) when a user needs to provide a second factor to sign in.

<b>Signature:</b>

```typescript
export abstract class MultiFactorResolver 
```

## Example


```javascript
let resolver;
let multiFactorHints;

signInWithEmailAndPassword(auth, email, password)
    .then((result) => {
      // User signed in. No 2nd factor challenge is needed.
    })
    .catch((error) => {
      if (error.code == 'auth/multi-factor-auth-required') {
        resolver = getMultiFactorResolver(auth, error);
        // Show UI to let user select second factor.
        multiFactorHints = resolver.hints;
      } else {
        // Handle other errors.
      }
    });

// The enrolled second factors that can be used to complete
// sign-in are returned in the `MultiFactorResolver.hints` list.
// UI needs to be presented to allow the user to select a second factor
// from that list.

const selectedHint = // ; selected from multiFactorHints
const phoneAuthProvider = new PhoneAuthProvider(auth);
const phoneInfoOptions = {
  multiFactorHint: selectedHint,
  session: resolver.session
};
const verificationId = phoneAuthProvider.verifyPhoneNumber(phoneInfoOptions, appVerifier);
// Store `verificationId` and show UI to let user enter verification code.

// UI to enter verification code and continue.
// Continue button click handler
const phoneAuthCredential = PhoneAuthProvider.credential(verificationId, verificationCode);
const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(phoneAuthCredential);
const userCredential = await resolver.resolveSignIn(multiFactorAssertion);

```

## Properties

|  Property | Modifiers | Type | Description |
|  --- | --- | --- | --- |
|  [hints](./auth-types.multifactorresolver.hints.md) |  | [MultiFactorInfo](./auth-types.multifactorinfo.md)<!-- -->\[\] | The list of hints for the second factors needed to complete the sign-in for the current session. |
|  [session](./auth-types.multifactorresolver.session.md) |  | [MultiFactorSession](./auth-types.multifactorsession.md) | The session identifier for the current sign-in flow, which can be used to complete the second factor sign-in. |

## Methods

|  Method | Modifiers | Description |
|  --- | --- | --- |
|  [resolveSignIn(assertion)](./auth-types.multifactorresolver.resolvesignin.md) |  | A helper function to help users complete sign in with a second factor using an [MultiFactorAssertion](./auth-types.multifactorassertion.md) confirming the user successfully completed the second factor challenge. |

