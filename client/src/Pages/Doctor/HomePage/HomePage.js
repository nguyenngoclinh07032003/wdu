import DoctorOverview from '../Components/DoctorOverview';
import DoctorProfile from '../Components/DoctorProfile';
import DoctorQA from '../Components/DoctorQA';
import DoctorInbox from '../Components/DoctorInbox';

function HomePage({
    checkTypeSlideBar,
    onInboxUnreadChange,
    inboxRefreshKey,
    setCheckTypeSlideBar,
    inboxInitialFilter,
    onOpenInbox,
}) {
    return (
        <div>
            {checkTypeSlideBar === 0 ? (
                <DoctorOverview
                    inboxRefreshKey={inboxRefreshKey}
                    onOpenInbox={(filter) => {
                        onOpenInbox?.(filter || 'pending');
                    }}
                    onOpenProfile={() => setCheckTypeSlideBar?.(1)}
                    onOpenAI={() => setCheckTypeSlideBar?.(2)}
                />
            ) : null}

            {checkTypeSlideBar === 1 ? <DoctorProfile /> : null}

            {checkTypeSlideBar === 2 ? <DoctorQA /> : null}

            {checkTypeSlideBar === 3 ? (
                <DoctorInbox
                    onUnreadChange={onInboxUnreadChange}
                    inboxRefreshKey={inboxRefreshKey}
                    initialFilter={inboxInitialFilter}
                />
            ) : null}
        </div>
    );
}

export default HomePage;
