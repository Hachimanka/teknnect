import { useNavigate } from 'react-router-dom';
import './HomePage.css';
import bottomLogo from '../assets/bottomlogo.png';
import email from '../assets/email.png';
import phone from '../assets/phone.png';
import location from '../assets/location.png';
import money from '../assets/money.png';
import earth from '../assets/earth.png';
import tao from '../assets/tao.png';
import posticon from '../assets/Posticon.png';
import exchangeicon from '../assets/Exchangeicon.png';
import connecticon from '../assets/Connecticon.png';
import {Link} from 'react-router-dom';

function HomePage() {
  const navigate = useNavigate();

  const handleLoginClick = () => {
    navigate('/login');
  };
  //   const scrollToHowItWorks = () => {
  //   const section = document.getElementById('how-it-works-section');
  //   if (section) {
  //     section.scrollIntoView({ behavior: 'smooth' });
  //   }
  // };

  return (
    <div className="PageWrapper">
      {/* Section 1 with HomePage background */}
      <section className="Section section1">
        <div className="HomePage">
          <header className="Header">
            <button className="BrowseButton">Browse Marketplace</button>
            <button className="PostButton">Post an Item</button>
          </header>

          <main className="MainContent">
            <h1 className="MainTitle">
              Trade, Rent & Find<br /> Items on Campus
            </h1>
            <p className="SubTitle">
              The student marketplace that<br /> makes campus life easier and more<br /> sustainable.
            </p>

            <div className="ActionButtons">
              <button onClick={handleLoginClick} className="GetStartedButton">
                Get Started
              </button>
              <button className="HowItWorksButton">
                How it works
              </button>
            </div>
          </main>
        </div>
      </section>

      {/* Section 2 with YellowBackground */}
      <section className="Section section3" id="how-it-works-section">
        <h1 className="pageTitle">Why Use TeknecT</h1>
        <section className="trade-items">
          <div className="card1">
            <img src={money} alt="Money" className="icon2" />
            <h3 className="title"><strong>Save Money</strong></h3>
            <p className="description">Trade or rent items instead of buying new ones. Keep more money in your pocket for what really matters.</p>
          </div>

          <div className="card2">
            <img src={earth} alt="Earth" className="icon2" />
            <h3 className="title"><strong>Eco-Friendly</strong></h3>
            <p className="description">Reduce waste by reusing and sharing resources. Help create a more sustainable campus community.</p>
          </div>

          <div className="card3">
            <img src={tao} alt="Person" className="icon2" />
            <h3 className="title"><strong>Build Community</strong></h3>
            <p className="description">Connect with fellow students,  make new friends, and help each other succeed throughout your academic journey.</p>
          </div>
        </section>

        <div className="how-it-works"> 
           <h1 className="TeknecT-Works">How TeknecT Works</h1>
           <p className="Work-as">Our Platform makes it easy to trade, rent, and find lost items within your<br/>campus community</p>
        </div>
        <div className="IconsS2">
          <div className="icon-group">
            <img src={posticon} alt="posticon" className="icon3" />
            <h1 className="PostText">Post your Item<br/></h1>
            <p className="desc1"><br/><br/>Create a listing for items you want to trade, rent out, or report as lost or found.</p>
          </div>
          
          <div className="icon-group">
            <img src={connecticon} alt="connecticon" className="icon3" />
            <h1 className="PostText">Connect with Students</h1>
            <p className="desc"><br/>Receive requests and messages from interested students on campus.</p>
          </div>

          <div className="icon-group">
            <img src={exchangeicon} alt="exchangeicon" className="icon3" />
            <h1 className="PostText">Complete the Exchange</h1>
            <p className="desc"><br/>Meet safely on campus to trade, rent, or return lost items to their owners.</p>
          </div>
        </div>
      </section>

      {/* Section 3 with BottomPage2 background */}
      <section className="Section section4">
        <div className="Section4Content">
          <h1 className="Section4Heading">Get in Touch</h1>

          <div className="ContactGroup">
            <div className="ContactItem1">
              <img src={email} alt="Email Icon" className="icon" />
              <div>
                <p className="ContactLabel">Email</p>
                <p className="ContactInfo">johnmichael.inoc@cit.edu</p>
              </div>
            </div>

            <div className="ContactItem2">
              <img src={phone} alt="Phone Icon" className="icon" />
              <div>
                <p className="ContactLabel">Phone</p>
                <p className="ContactInfo">091-7652-5690</p>
              </div>
            </div>

            <div className="ContactItem3">
              <img src={location} alt="Location Icon" className="icon" />
              <div>
                <p className="ContactLabel">Location</p>
                <p className="ContactInfo">Duljo, Fatima</p>
              </div>
            </div>
          </div>

          <div className="BottomGroup">
            <div className="LogoWithMessage">
              <img src={bottomLogo} alt="Logo" className="bottom-logo" />
              <p className="message">
                The student marketplace <br />
                that makes campus life <br />
                easier and more <br />
                sustainable
              </p>
            </div>

            <div className="FooterLinksRow">
              <div className="quickLinks">
                <h3>Quick Links</h3>
                <Link to="/">Home</Link><br />
                <Link to="/trade">Trade</Link><br />
                <Link to="/rent">Rent</Link><br />
                <Link to="/lost-found">Lost & Found</Link><br />
                <Link to="/donations">Donations</Link><br />
                <Link to="/about">About</Link><br />
              </div>

              <div className="resourceLinks">
                <h3 className="resources">Resources</h3>
                <Link to="/">Home</Link><br />
                <Link to="/trade">Trade</Link><br />
                <Link to="/rent">Rent</Link><br />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default HomePage;