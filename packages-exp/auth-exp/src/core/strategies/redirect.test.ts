import * as externs from '@firebase/auth-types-exp';
import * as sinon from 'sinon';
import { _getInstance } from '../util/instantiator';
import { MockPersistenceLayer, TestAuth, testAuth, testUser } from '../../../test/helpers/mock_auth';
import { makeMockPopupRedirectResolver } from '../../../test/helpers/mock_popup_redirect_resolver';
import { Auth } from '../../model/auth';
import { AuthEventManager } from '../auth/auth_event_manager';
import { RedirectAction, _clearRedirectOutcomes } from './redirect';
import { AuthEvent, AuthEventType, PopupRedirectResolver } from '../../model/popup_redirect';
import { BASE_AUTH_EVENT } from '../../../test/helpers/iframe_event';
import { Persistence } from '../persistence';
import { InMemoryPersistence } from '../persistence/in_memory';
import { UserCredentialImpl } from '../user/user_credential_impl';
import * as idpTasks from '../strategies/idp';
import { expect } from 'chai';
import { AuthErrorCode } from '../errors';


const MATCHING_EVENT_ID = 'matching-event-id';
const OTHER_EVENT_ID = 'wrong-id';

class RedirectPersistence extends InMemoryPersistence {}

describe('core/strategies/redirect', () => {
  let auth: Auth;
  let redirectAction: RedirectAction;
  let eventManager: AuthEventManager;
  let resolver: externs.PopupRedirectResolver;
  let idpStubs: sinon.SinonStubbedInstance<typeof idpTasks>;

  beforeEach(async () => {
    eventManager = new AuthEventManager(({} as unknown) as TestAuth);
    idpStubs = sinon.stub(idpTasks);
    resolver = makeMockPopupRedirectResolver(eventManager);
    _getInstance<PopupRedirectResolver>(resolver)._redirectPersistence = RedirectPersistence;
    auth = await testAuth();
    redirectAction = new RedirectAction(auth, _getInstance(resolver), false);
  });

  afterEach(() => {
    sinon.restore();
    _clearRedirectOutcomes();
  });

  function iframeEvent(event: Partial<AuthEvent>): void {
    // Push the dispatch out of the synchronous flow
    setTimeout(() => {
      eventManager.onEvent({
        ...BASE_AUTH_EVENT,
        eventId: MATCHING_EVENT_ID,
        ...event
      });
    }, 1);
  }

  async function reInitAuthWithRedirectUser(eventId: string): Promise<void> {
    const redirectPersistence: Persistence = _getInstance(
      RedirectPersistence
    );
    const mainPersistence = new MockPersistenceLayer();
    const oldAuth = await testAuth();
    const user = testUser(oldAuth, 'uid');
    user._redirectEventId = eventId;
    sinon
      .stub(redirectPersistence, '_get')
      .returns(Promise.resolve(user.toJSON()));
    sinon
      .stub(mainPersistence, '_get')
      .returns(Promise.resolve(user.toJSON()));

    auth = await testAuth(resolver, mainPersistence);
    redirectAction = new RedirectAction(auth, _getInstance(resolver), true);
  }

  it('completes with the cred', async () => {
    const cred = new UserCredentialImpl({
      user: testUser(auth, 'uid'),
      providerId: externs.ProviderId.GOOGLE,
      operationType: externs.OperationType.SIGN_IN
    });
    idpStubs._signIn.returns(Promise.resolve(cred));
    const promise = redirectAction.execute();
    iframeEvent({
      type: AuthEventType.SIGN_IN_VIA_REDIRECT
    });
    expect(await promise).to.eq(cred);
  });

  it('returns the same value if called multiple times', async () => {
    const cred = new UserCredentialImpl({
      user: testUser(auth, 'uid'),
      providerId: externs.ProviderId.GOOGLE,
      operationType: externs.OperationType.SIGN_IN
    });
    idpStubs._signIn.returns(Promise.resolve(cred));
    const promise = redirectAction.execute();
    iframeEvent({
      type: AuthEventType.SIGN_IN_VIA_REDIRECT
    });
    expect(await promise).to.eq(cred);
    expect(await redirectAction.execute()).to.eq(cred);
  });

  it('interacts with redirectUser loading from auth object', async () => {
    // We need to re-initialize auth since it pulls the redirect user at
    // auth load
    await reInitAuthWithRedirectUser(MATCHING_EVENT_ID);

    const cred = new UserCredentialImpl({
      user: testUser(auth, 'uid'),
      providerId: externs.ProviderId.GOOGLE,
      operationType: externs.OperationType.LINK
    });
    idpStubs._link.returns(Promise.resolve(cred));
    const promise = redirectAction.execute();
    iframeEvent({
      type: AuthEventType.LINK_VIA_REDIRECT
    });
    expect(await promise).to.eq(cred);
  });

  it('returns null if the event id mismatches', async () => {
    // We need to re-initialize auth since it pulls the redirect user at
    // auth load
    await reInitAuthWithRedirectUser(OTHER_EVENT_ID);

    const cred = new UserCredentialImpl({
      user: testUser(auth, 'uid'),
      providerId: externs.ProviderId.GOOGLE,
      operationType: externs.OperationType.LINK
    });
    idpStubs._link.returns(Promise.resolve(cred));
    const promise = redirectAction.execute();
    iframeEvent({
      type: AuthEventType.LINK_VIA_REDIRECT
    });
    expect(await promise).to.be.null;
  });

  it('returns null if there is no pending redirect', async () => {
    const promise = redirectAction.execute();
    iframeEvent({
      type: AuthEventType.UNKNOWN,
      error: {
        code: `auth/${AuthErrorCode.NO_AUTH_EVENT}`
      } as externs.AuthError
    });
    expect(await promise).to.be.null;
  });

  it('works with reauthenticate', async () => {
    await reInitAuthWithRedirectUser(MATCHING_EVENT_ID);

    const cred = new UserCredentialImpl({
      user: testUser(auth, 'uid'),
      providerId: externs.ProviderId.GOOGLE,
      operationType: externs.OperationType.REAUTHENTICATE
    });
    idpStubs._reauth.returns(Promise.resolve(cred));
    const promise = redirectAction.execute();
    iframeEvent({
      type: AuthEventType.REAUTH_VIA_REDIRECT
    });
    expect(await promise).to.eq(cred);
    expect(await redirectAction.execute()).to.eq(cred);
  });
});